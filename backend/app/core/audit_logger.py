"""
audit_logger.py  —  Compliance & Action Audit Trail Logger for Synexis

Every remediation approval, execution, incident lifecycle update, and configuration change
is recorded here with full actor, role, target, timestamp, and verification evidence.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from backend.app.database import db_session
from backend.app.database.models import AuditLog


class AuditLogger:
    """Central audit recorder for Synexis platform operations."""

    def log(
        self,
        action: str,
        target: Optional[str] = None,
        actor: str = "system",
        role: str = "operator",
        reason: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
        result: str = "SUCCESS",
    ) -> dict[str, Any]:
        """
        Record a structured audit entry in the database.
        """
        entry = {
            "action": action,
            "target": target or "",
            "actor": actor,
            "role": role,
            "reason": reason or "",
            "details": details or {},
            "result": result,
            "timestamp": datetime.now(timezone.utc),
        }
        try:
            with db_session() as db:
                log_row = AuditLog(
                    action=entry["action"],
                    target=entry["target"],
                    actor=entry["actor"],
                    role=entry["role"],
                    reason=entry["reason"],
                    details=entry["details"],
                    result=entry["result"],
                    timestamp=entry["timestamp"],
                )
                db.add(log_row)
                db.commit()
                return log_row.to_dict()
        except Exception:
            return {
                "id": -1,
                "action": action,
                "target": target,
                "actor": actor,
                "role": role,
                "reason": reason,
                "details": details,
                "result": result,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    def get_logs(self, limit: int = 50) -> list[dict[str, Any]]:
        """Retrieve recent audit logs sorted by timestamp descending."""
        try:
            with db_session() as db:
                rows = (
                    db.query(AuditLog)
                    .order_by(AuditLog.timestamp.desc())
                    .limit(limit)
                    .all()
                )
                return [r.to_dict() for r in rows]
        except Exception:
            return []


audit_logger = AuditLogger()
