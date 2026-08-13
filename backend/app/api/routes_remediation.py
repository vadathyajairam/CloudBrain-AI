"""
routes_remediation.py  —  Safe Remediation & Audit Log Endpoints for Synexis
"""
from __future__ import annotations

from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.app.core.audit_logger import audit_logger
from backend.app.core.remediation_engine import (
    ALLOWED_ACTIONS,
    AuthorizationError,
    SafetyValidationError,
    remediation_engine,
)

router = APIRouter(prefix="/remediate", tags=["Remediation & Safety"])


class ProposeActionRequest(BaseModel):
    action_type: str       # restart_container | start_container | stop_container
    target: str            # must start with "synexis-"
    reason: str
    incident_id: Optional[str] = None
    proposed_by: str = "ai_rca_engine"


class ApproveRequest(BaseModel):
    approved_by: str = "admin"
    role: str = "admin"


@router.get("/allowed-actions")
def get_allowed_actions() -> dict[str, Any]:
    """List all permitted remediation action types."""
    return {"allowed_actions": ALLOWED_ACTIONS}


@router.post("/propose")
def propose_action(req: ProposeActionRequest) -> dict[str, Any]:
    """Propose a remediation action (creates PENDING action awaiting operator approval)."""
    try:
        return remediation_engine.propose_action(
            action_type=req.action_type,
            target=req.target,
            reason=req.reason,
            incident_id=req.incident_id,
            proposed_by=req.proposed_by,
        )
    except SafetyValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{action_id}/approve")
def approve_and_execute(action_id: str, req: Optional[ApproveRequest] = None) -> dict[str, Any]:
    """Approve a PENDING remediation action with operator identity and execute immediately."""
    approved_by = req.approved_by if req else "admin"
    role = req.role if req else "admin"
    try:
        return remediation_engine.approve_and_execute(
            action_id=action_id,
            approved_by=approved_by,
            role=role,
        )
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except SafetyValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/actions")
def list_actions(limit: int = Query(default=50, ge=1, le=200)) -> dict[str, Any]:
    """List all remediation actions (pending and executed)."""
    actions = remediation_engine.list_actions(limit=limit)
    return {
        "total": len(actions),
        "actions": actions,
        "pending": [a for a in actions if a["status"] == "PENDING"],
    }


@router.get("/audit-logs")
def get_audit_logs(limit: int = Query(default=50, ge=1, le=200)) -> dict[str, Any]:
    """Retrieve verified compliance audit logs."""
    logs = audit_logger.get_logs(limit=limit)
    return {"total": len(logs), "audit_logs": logs}
