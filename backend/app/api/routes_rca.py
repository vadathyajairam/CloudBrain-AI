"""
routes_rca.py  —  Evidence-Based AI RCA API for Synexis
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from backend.app.core.ai_rca_engine import ai_rca_engine

router = APIRouter(tags=["AI RCA"])


class RCARequest(BaseModel):
    incident_id: Optional[str] = None


@router.post("/rca/analyze")
@router.post("/analyze/rca")
def perform_rca(req: Optional[RCARequest] = None):
    """
    Run evidence-based RCA for an incident.
    If incident_id provided, loads DB evidence for that incident.
    Otherwise runs against current live telemetry.
    """
    incident_id = req.incident_id if req else None
    return ai_rca_engine.analyze_incident(incident_id=incident_id)


@router.post("/rca/analyze/{incident_id}")
@router.post("/analyze/rca/{incident_id}")
def perform_rca_for_incident(incident_id: str):
    """Run RCA for a specific incident by ID."""
    return ai_rca_engine.analyze_incident(incident_id=incident_id)
