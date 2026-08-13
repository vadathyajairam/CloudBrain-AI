"""
routes_incidents.py  —  Database-backed Incident Lifecycle API for Synexis
"""
from __future__ import annotations

from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.app.core.incident_manager import incident_manager

router = APIRouter(prefix="/incidents", tags=["Incidents Lifecycle"])


class ResolveRequest(BaseModel):
    resolution_summary: Optional[str] = "Resolved by operator verification."
    actor: Optional[str] = "operator"


@router.get("")
def list_incidents(limit: int = Query(default=50, ge=1, le=200)) -> dict[str, Any]:
    """List active incidents, recent history, and summary stats."""
    active = incident_manager.get_active()
    all_incidents = incident_manager.get_all(limit=limit)
    resolved = [i for i in all_incidents if i["status"] in ("RESOLVED", "CLOSED")]
    stats = incident_manager.get_stats()
    return {
        "stats": stats,
        "active_count": len(active),
        "active_incidents": active,
        "resolved_incidents": resolved,
        "all_incidents": all_incidents,
    }


@router.get("/stats")
def incident_stats() -> dict[str, Any]:
    """Summary counts of total, active, and resolved incidents."""
    return incident_manager.get_stats()


@router.get("/{incident_id}")
def get_incident(incident_id: str) -> dict[str, Any]:
    """Retrieve full incident details with evidence history and RCA analysis."""
    inc = incident_manager.get_by_id(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
    return inc


@router.patch("/{incident_id}/acknowledge")
def acknowledge_incident(incident_id: str) -> dict[str, Any]:
    """Transition incident status to ACKNOWLEDGED."""
    inc = incident_manager.acknowledge(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
    return inc


@router.patch("/{incident_id}/investigate")
def investigate_incident(incident_id: str) -> dict[str, Any]:
    """Transition incident status to INVESTIGATING."""
    inc = incident_manager.set_investigating(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
    return inc


@router.patch("/{incident_id}/resolve")
def resolve_incident(incident_id: str, req: Optional[ResolveRequest] = None) -> dict[str, Any]:
    """Transition incident status to RESOLVED and index resolution into RAG knowledge."""
    summary = req.resolution_summary if req else "Resolved by operator."
    actor = req.actor if req else "operator"
    inc = incident_manager.resolve_incident(
        incident_id=incident_id,
        auto_resolved=False,
        resolution_summary=summary,
        actor=actor,
    )
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
    return inc


@router.patch("/{incident_id}/close")
def close_incident(incident_id: str) -> dict[str, Any]:
    """Transition incident status to final CLOSED state."""
    inc = incident_manager.close_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
    return inc
