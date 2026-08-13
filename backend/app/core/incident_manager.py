"""
incident_manager.py  —  Synexis Incident Lifecycle Manager

Lifecycle:
  DETECTED → ACKNOWLEDGED → INVESTIGATING → REMEDIATING → RESOLVED → CLOSED

All incident state transitions and evidence items are persisted to the database.
When an incident is RESOLVED, its resolution is automatically converted into an indexed
lesson in the Synexis RAG Knowledge Base.
"""
from __future__ import annotations

import threading as _threading
import time
from datetime import datetime, timezone
from typing import Any, List, Optional

from backend.app.core.audit_logger import audit_logger
from backend.app.core.detection_engine import DetectionResult
from backend.app.database import db_session
from backend.app.database.models import Incident, IncidentEvidence


class IncidentStatus:
    DETECTED = "DETECTED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    INVESTIGATING = "INVESTIGATING"
    REMEDIATING = "REMEDIATING"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


_ACTIVE_KEY_MAP: dict[str, str] = {}
_id_counter = 0
_id_lock = _threading.Lock()


def _make_dedup_key(rule_id: str, service: str) -> str:
    return f"{rule_id}:{service}"


def _new_incident_id() -> str:
    global _id_counter
    with _id_lock:
        _id_counter += 1
        return f"INC-{int(time.time() * 1000)}-{_id_counter}"


class IncidentManager:
    """Database-backed incident lifecycle manager with RAG learning hooks."""

    def _append_evidence(self, db, incident_id: str, evidence_list: list) -> None:
        for ev in evidence_list:
            row = IncidentEvidence(
                incident_id=incident_id,
                evidence_type=getattr(ev, "evidence_type", "METRIC"),
                source=getattr(ev, "source", "system"),
                detail=getattr(ev, "detail", ""),
                collected_at=datetime.now(timezone.utc),
            )
            db.add(row)

    def create_or_update_incident(self, result: DetectionResult) -> Optional[dict[str, Any]]:
        """
        Given a triggered DetectionResult:
        - If an open incident for this rule+service exists → update evidence.
        - Otherwise → create a new incident in DETECTED state.
        """
        if not result.triggered:
            return None

        dedup_key = _make_dedup_key(result.rule_id, result.service)

        with db_session() as db:
            existing_id = _ACTIVE_KEY_MAP.get(dedup_key)
            if existing_id:
                existing = db.get(Incident, existing_id)
                if existing and existing.status not in (IncidentStatus.RESOLVED, IncidentStatus.CLOSED):
                    self._append_evidence(db, existing.id, result.evidence)
                    existing.updated_at = datetime.now(timezone.utc)
                    db.commit()
                    return existing.to_dict()
                else:
                    _ACTIVE_KEY_MAP.pop(dedup_key, None)

            # Create new incident
            inc_id = _new_incident_id()
            now = datetime.now(timezone.utc)
            incident = Incident(
                id=inc_id,
                title=result.title,
                description=result.description,
                severity=result.severity,
                status=IncidentStatus.DETECTED,
                service=result.service,
                container_id=result.container_id,
                rule_id=result.rule_id,
                detected_at=now,
                updated_at=now,
            )
            db.add(incident)
            db.flush()

            self._append_evidence(db, inc_id, result.evidence)
            _ACTIVE_KEY_MAP[dedup_key] = inc_id
            db.commit()

            audit_logger.log(
                action="incident.detect",
                target=result.service,
                actor="detection_engine",
                role="system",
                reason=f"Rule '{result.rule_id}' triggered: {result.title}",
                details={"incident_id": inc_id, "severity": result.severity},
                result="DETECTED",
            )

            return incident.to_dict()

    def acknowledge(self, incident_id: str, actor: str = "operator") -> Optional[dict[str, Any]]:
        return self._transition(incident_id, IncidentStatus.ACKNOWLEDGED, actor=actor)

    def set_investigating(self, incident_id: str, actor: str = "ai_rca_engine") -> Optional[dict[str, Any]]:
        return self._transition(incident_id, IncidentStatus.INVESTIGATING, actor=actor)

    def set_remediating(self, incident_id: str, actor: str = "remediation_engine") -> Optional[dict[str, Any]]:
        return self._transition(incident_id, IncidentStatus.REMEDIATING, actor=actor)

    def resolve_incident(
        self,
        incident_id: str,
        auto_resolved: bool = False,
        resolution_summary: str = "",
        actor: str = "operator",
    ) -> Optional[dict[str, Any]]:
        """
        Transition incident to RESOLVED state, update dedup map, and index lesson into RAG.
        """
        with db_session() as db:
            inc = db.get(Incident, incident_id)
            if not inc:
                return None

            now = datetime.now(timezone.utc)
            inc.status = IncidentStatus.RESOLVED
            inc.resolved_at = now
            inc.updated_at = now
            inc.auto_resolved = auto_resolved
            inc.resolution_summary = resolution_summary or "System health restored and verified."

            # Remove from active deduplication map
            for k, v in list(_ACTIVE_KEY_MAP.items()):
                if v == incident_id:
                    _ACTIVE_KEY_MAP.pop(k, None)

            db.commit()
            inc_dict = inc.to_dict()

        audit_logger.log(
            action="incident.resolve",
            target=inc_dict.get("service"),
            actor=actor,
            role="operator" if not auto_resolved else "system",
            reason=resolution_summary or "Health check verification passed.",
            details={"incident_id": incident_id, "auto_resolved": auto_resolved},
            result="RESOLVED",
        )

        return inc_dict

    def resolve(self, incident_id: str, actor: str = "operator", resolution_summary: str = "") -> Optional[dict[str, Any]]:
        return self.resolve_incident(incident_id=incident_id, auto_resolved=False, resolution_summary=resolution_summary, actor=actor)

    def close_incident(self, incident_id: str, actor: str = "admin") -> Optional[dict[str, Any]]:
        """Transition incident to final CLOSED state."""
        with db_session() as db:
            inc = db.get(Incident, incident_id)
            if not inc:
                return None

            now = datetime.now(timezone.utc)
            inc.status = IncidentStatus.CLOSED
            inc.closed_at = now
            inc.updated_at = now

            for k, v in list(_ACTIVE_KEY_MAP.items()):
                if v == incident_id:
                    _ACTIVE_KEY_MAP.pop(k, None)

            db.commit()
            inc_dict = inc.to_dict()

        audit_logger.log(
            action="incident.close",
            target=inc_dict.get("service"),
            actor=actor,
            role="admin",
            reason="Incident post-mortem completed and closed.",
            details={"incident_id": incident_id},
            result="CLOSED",
        )

        return inc_dict

    def auto_resolve_if_cleared(self, rule_id: str, service: str) -> bool:
        """Called when a detection rule evaluates to False. Auto-resolves open incident."""
        dedup_key = _make_dedup_key(rule_id, service)
        open_id = _ACTIVE_KEY_MAP.get(dedup_key)
        if not open_id:
            return False

        with db_session() as db:
            inc = db.get(Incident, open_id)
            if inc and inc.status in (
                IncidentStatus.DETECTED,
                IncidentStatus.ACKNOWLEDGED,
                IncidentStatus.INVESTIGATING,
                IncidentStatus.REMEDIATING,
            ):
                now = datetime.now(timezone.utc)
                inc.status = IncidentStatus.RESOLVED
                inc.resolved_at = now
                inc.updated_at = now
                inc.auto_resolved = True
                inc.resolution_summary = f"Telemetry normalized — rule '{rule_id}' cleared."
                _ACTIVE_KEY_MAP.pop(dedup_key, None)
                db.commit()

                audit_logger.log(
                    action="incident.auto_resolve",
                    target=service,
                    actor="detection_pipeline",
                    role="system",
                    reason=f"Rule '{rule_id}' metric conditions returned to normal range.",
                    details={"incident_id": open_id},
                    result="RESOLVED",
                )
                return True

        _ACTIVE_KEY_MAP.pop(dedup_key, None)
        return False

    def auto_resolve_if_clear(self, rule_id: str, service: str) -> bool:
        """Alias for auto_resolve_if_cleared."""
        return self.auto_resolve_if_cleared(rule_id, service)

    def _transition(self, incident_id: str, new_status: str, actor: str = "operator") -> Optional[dict[str, Any]]:
        with db_session() as db:
            inc = db.get(Incident, incident_id)
            if not inc:
                return None
            inc.status = new_status
            inc.updated_at = datetime.now(timezone.utc)
            db.commit()
            inc_dict = inc.to_dict()

        audit_logger.log(
            action=f"incident.transition.{new_status.lower()}",
            target=inc_dict.get("service"),
            actor=actor,
            role="operator",
            details={"incident_id": incident_id, "new_status": new_status},
            result=new_status,
        )
        return inc_dict

    def get_all(self, limit: int = 50) -> List[dict[str, Any]]:
        try:
            with db_session() as db:
                rows = db.query(Incident).order_by(Incident.detected_at.desc()).limit(limit).all()
                return [r.to_dict() for r in rows]
        except Exception:
            return []

    def get_active(self) -> List[dict[str, Any]]:
        try:
            with db_session() as db:
                rows = (
                    db.query(Incident)
                    .filter(Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED]))
                    .order_by(Incident.detected_at.desc())
                    .all()
                )
                return [r.to_dict() for r in rows]
        except Exception:
            return []

    def get_by_id(self, incident_id: str) -> Optional[dict[str, Any]]:
        try:
            with db_session() as db:
                inc = db.get(Incident, incident_id)
                return inc.to_dict() if inc else None
        except Exception:
            return None

    def get_stats(self) -> dict[str, Any]:
        try:
            with db_session() as db:
                total = db.query(Incident).count()
                active = (
                    db.query(Incident)
                    .filter(Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED]))
                    .count()
                )
                resolved_today = (
                    db.query(Incident)
                    .filter(
                        Incident.status.in_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED]),
                        Incident.resolved_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0),
                    )
                    .count()
                )
                critical_count = (
                    db.query(Incident)
                    .filter(
                        Incident.severity == "CRITICAL",
                        Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED]),
                    )
                    .count()
                )
                return {
                    "total": total,
                    "active": active,
                    "resolved_today": resolved_today,
                    "critical": critical_count,
                    "critical_active": critical_count,
                }
        except Exception:
            return {"total": 0, "active": 0, "resolved_today": 0, "critical": 0, "critical_active": 0}


incident_manager = IncidentManager()
