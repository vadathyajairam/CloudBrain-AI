"""
routes_simulation.py  —  FastAPI router for Synexis Local Cloud-Style Simulation
"""
from __future__ import annotations

from typing import Any, Dict
from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.core.cloud_simulator import cloud_simulator

router = APIRouter(prefix="/simulation", tags=["Cloud Simulation"])


class ResourceActionRequest(BaseModel):
    resource_id: str


@router.get("/status")
def get_simulation_status() -> Dict[str, Any]:
    """Get local cloud simulation status."""
    return cloud_simulator.get_status()


@router.get("/resources")
def list_simulated_resources() -> Dict[str, Any]:
    """List all simulated cloud infrastructure resources."""
    resources = cloud_simulator.list_resources()
    return {
        "count": len(resources),
        "resources": [r.to_dict() for r in resources],
    }


@router.post("/inject")
def inject_simulation_failure(req: ResourceActionRequest) -> Dict[str, Any]:
    """Simulate failure of a cloud resource."""
    success = cloud_simulator.inject_resource_failure(req.resource_id)
    return {
        "success": success,
        "resource_id": req.resource_id,
        "status": "DEGRADED" if success else "NOT_FOUND",
    }


@router.post("/recover")
def recover_simulation_resource(req: ResourceActionRequest) -> Dict[str, Any]:
    """Recover simulated resource to available state."""
    success = cloud_simulator.recover_resource(req.resource_id)
    return {
        "success": success,
        "resource_id": req.resource_id,
        "status": "AVAILABLE" if success else "NOT_FOUND",
    }
