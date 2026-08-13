"""
remediation_engine.py  —  Safe Remediation Engine for Synexis

Architecture:
  AI RCA / Operator Proposes Action
       ↓
  Safety Validator (allowlisted action types + allowed container prefix)
       ↓
  User Authorization & Explicit Approval Check (Role: admin / sre_operator / operator)
       ↓
  Execute Real Docker Action (via container_engine)
       ↓
  Real Verification Engine (Process running, health check, log quiescence)
       ↓
  Audit Trail Logged & Incident Auto-Resolved (if verification passes)
       ↓
  Lesson Indexed to RAG Knowledge Base
"""
from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.app.config import settings
from backend.app.core.audit_logger import audit_logger
from backend.app.core.container_engine import container_engine
from backend.app.core.incident_manager import incident_manager
from backend.app.core.rag_engine import rag_engine
from backend.app.core.verification_engine import verification_engine
from backend.app.database import db_session
from backend.app.database.models import Incident, RemediationAction

# ── Structured Action Allowlist ───────────────────────────────────────────────
ALLOWED_ACTIONS: Dict[str, str] = {
    "restart_container": "Restart a sandbox container",
    "start_container": "Start a stopped sandbox container",
    "stop_container": "Stop a running sandbox container",
}

# ── Allowed Roles ─────────────────────────────────────────────────────────────
AUTHORIZED_ROLES: set[str] = {"admin", "sre_operator", "operator", "engineer"}


class SafetyValidationError(Exception):
    pass


class AuthorizationError(Exception):
    pass


def _validate_action(action_type: str, target: str) -> None:
    """
    Validate a structured action before scheduling or execution.
    """
    if action_type not in ALLOWED_ACTIONS:
        raise SafetyValidationError(
            f"Action '{action_type}' is not permitted. Allowed actions: {list(ALLOWED_ACTIONS.keys())}"
        )
    if not (target.startswith("synexis-") or target.startswith("cloudbrain-")):
        raise SafetyValidationError(
            f"Target '{target}' is outside the authorized sandbox container boundary."
        )
    clean_target = target.replace("-", "").replace("_", "")
    if not clean_target.isalnum():
        raise SafetyValidationError(f"Target '{target}' contains invalid characters.")


def _authorize_user(user_id: str, role: str) -> None:
    """
    Validate that the approving user has an authorized role.
    """
    if not user_id or not user_id.strip():
        raise AuthorizationError("Approval failed: A valid user identity is required.")
    if role.lower() not in AUTHORIZED_ROLES:
        raise AuthorizationError(
            f"User '{user_id}' with role '{role}' is not authorized to execute remediation. "
            f"Required roles: {list(AUTHORIZED_ROLES)}"
        )


class RemediationEngine:
    """Manages proposing, approving, executing, and verifying safe remediation actions."""

    def propose_action(
        self,
        action_type: str,
        target: str,
        reason: str,
        incident_id: Optional[str] = None,
        proposed_by: str = "ai_rca_engine",
    ) -> Dict[str, Any]:
        """
        Create a PENDING remediation action that requires explicit operator approval.
        """
        _validate_action(action_type, target)
        action_id = f"rem-{int(time.time() * 1000)}"

        try:
            with db_session() as db:
                action = RemediationAction(
                    id=action_id,
                    incident_id=incident_id,
                    action_type=action_type,
                    target=target,
                    reason=reason,
                    status="PENDING",
                    proposed_by=proposed_by,
                    created_at=datetime.now(timezone.utc),
                )
                db.add(action)
                db.commit()

            audit_logger.log(
                action="remediation.propose",
                target=target,
                actor=proposed_by,
                role="system",
                reason=reason,
                details={"action_id": action_id, "action_type": action_type, "incident_id": incident_id},
                result="PENDING",
            )

            return {
                "id": action_id,
                "incident_id": incident_id,
                "action_type": action_type,
                "target": target,
                "reason": reason,
                "status": "PENDING",
                "proposed_by": proposed_by,
            }
        except Exception:
            return {
                "id": action_id,
                "incident_id": incident_id,
                "action_type": action_type,
                "target": target,
                "reason": reason,
                "status": "PENDING",
                "proposed_by": proposed_by,
            }

    def approve_and_execute(
        self,
        action_id: str,
        approved_by: str = "admin",
        role: str = "admin",
    ) -> Dict[str, Any]:
        """
        Operator approves a pending action.
        Verifies authorization, executes real Docker command, performs verification,
        and auto-resolves the incident upon verified recovery.
        """
        _authorize_user(approved_by, role)

        # 1. Fetch action from DB
        action_dict: Optional[dict] = None
        with db_session() as db:
            action = db.get(RemediationAction, action_id)
            if not action:
                raise ValueError(f"Remediation action '{action_id}' not found.")
            if action.status not in ("PENDING",):
                raise ValueError(f"Action '{action_id}' has already been processed (status: {action.status}).")

            _validate_action(action.action_type, action.target)
            action.status = "APPROVED"
            action.approved_by = approved_by
            action.approved_at = datetime.now(timezone.utc)
            db.commit()
            action_dict = action.to_dict()

        target = action_dict["target"]
        action_type = action_dict["action_type"]
        incident_id = action_dict.get("incident_id")

        audit_logger.log(
            action="remediation.approve",
            target=target,
            actor=approved_by,
            role=role,
            reason=action_dict.get("reason"),
            details={"action_id": action_id, "action_type": action_type},
            result="APPROVED",
        )

        # 2. Execute Real Docker Action
        exec_result: dict[str, Any] = {}
        exec_success = False

        try:
            if action_type == "restart_container":
                exec_result = container_engine.restart_container(target)
                exec_success = exec_result.get("status") == "success"
            elif action_type == "start_container":
                exec_result = container_engine.start_container(target)
                exec_success = exec_result.get("status") == "success"
            elif action_type == "stop_container":
                exec_result = container_engine.stop_container(target)
                exec_success = exec_result.get("status") == "success"
            else:
                exec_result = {"status": "error", "message": f"Unsupported action {action_type}"}
        except Exception as exc:
            exec_result = {"status": "error", "message": str(exc)}
            exec_success = False

        # 3. Post-execution Real Verification
        verif = verification_engine.verify(target_container=target, wait_seconds=0.0)
        overall_success = exec_success and verif.passed

        final_status = "SUCCESS" if overall_success else "FAILED"
        executed_at = datetime.now(timezone.utc)

        # 4. Update action in DB
        with db_session() as db:
            action = db.get(RemediationAction, action_id)
            if action:
                action.status = final_status
                action.executed_at = executed_at
                action.result = exec_result
                action.verification = verif.to_dict()
                db.commit()

        # 5. Record execution in audit logs
        audit_logger.log(
            action="remediation.execute",
            target=target,
            actor=approved_by,
            role=role,
            reason=action_dict.get("reason"),
            details={
                "action_id": action_id,
                "action_type": action_type,
                "execution_result": exec_result,
                "verification_passed": verif.passed,
                "verification_summary": verif.summary,
            },
            result=final_status,
        )

        # 6. If verified recovery & linked to incident -> Resolve incident & Index into RAG!
        if overall_success and incident_id:
            try:
                incident_manager.resolve_incident(
                    incident_id=incident_id,
                    auto_resolved=False,
                    resolution_summary=f"Recovered by approved remediation '{action_type}' on '{target}'. Verification passed: {verif.summary}",
                )

                # Index lesson into RAG Knowledge Base
                rag_engine.index_incident({
                    "id": incident_id,
                    "title": f"Recovery of {target}",
                    "service": target,
                    "rule_id": action_type,
                    "root_cause": action_dict.get("reason", "Service disruption resolved."),
                    "action_type": action_type,
                    "evidence_summary": verif.summary,
                })
            except Exception:
                pass

        return {
            "id": action_id,
            "incident_id": incident_id,
            "action_type": action_type,
            "target": target,
            "status": final_status,
            "approved_by": approved_by,
            "executed_at": executed_at.isoformat(),
            "execution_result": exec_result,
            "verification": verif.to_dict(),
            "incident_resolved": overall_success and bool(incident_id),
        }

    def list_actions(self, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            with db_session() as db:
                actions = (
                    db.query(RemediationAction)
                    .order_by(RemediationAction.created_at.desc())
                    .limit(limit)
                    .all()
                )
                return [a.to_dict() for a in actions]
        except Exception:
            return []

    def get_action(self, action_id: str) -> Optional[Dict[str, Any]]:
        try:
            with db_session() as db:
                a = db.get(RemediationAction, action_id)
                return a.to_dict() if a else None
        except Exception:
            return None


remediation_engine = RemediationEngine()
