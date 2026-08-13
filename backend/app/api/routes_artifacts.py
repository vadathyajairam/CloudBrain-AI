"""
routes_artifacts.py  —  FastAPI router for Synexis Configuration Artifacts
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.core.artifact_generator import artifact_generator
from backend.app.core.artifact_validator import artifact_validator

router = APIRouter(prefix="/artifacts", tags=["Configuration Artifacts"])


class GenerateArtifactRequest(BaseModel):
    artifact_type: str = Field(..., description="kubernetes_manifest | docker_config | terraform_template")
    service_name: str = Field(..., description="Target service name e.g. synexis-postgres")
    template_subtype: Optional[str] = Field(None, description="Optional subtype e.g. deployment | service | dockerfile | compose | simulated_cloud")
    incident_id: Optional[str] = None
    rag_source_id: Optional[str] = None


class OperatorActionRequest(BaseModel):
    operator_name: str = "sre_operator"
    role: str = "admin"


@router.get("/")
def list_artifacts() -> Dict[str, Any]:
    """Return all generated configuration artifacts."""
    artifacts = artifact_generator.list_artifacts()
    return {
        "count": len(artifacts),
        "artifacts": [a.to_dict() for a in artifacts],
    }


@router.get("/{artifact_id}")
def get_artifact(artifact_id: str) -> Dict[str, Any]:
    """Retrieve a single artifact by ID."""
    art = artifact_generator.get_artifact(artifact_id)
    if not art:
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_id}' not found.")
    return art.to_dict()


@router.post("/generate")
def generate_artifact(req: GenerateArtifactRequest) -> Dict[str, Any]:
    """Generate a new configuration artifact."""
    if req.artifact_type == "kubernetes_manifest":
        if req.template_subtype == "service":
            art = artifact_generator.generate_k8s_service(
                service_name=req.service_name,
                incident_id=req.incident_id,
            )
        else:
            art = artifact_generator.generate_k8s_deployment(
                service_name=req.service_name,
                incident_id=req.incident_id,
                rag_source_id=req.rag_source_id or "RUNBOOK-DB-03",
            )
    elif req.artifact_type == "docker_config":
        if req.template_subtype == "compose":
            art = artifact_generator.generate_docker_compose(incident_id=req.incident_id)
        else:
            art = artifact_generator.generate_dockerfile(service_name=req.service_name, incident_id=req.incident_id)
    elif req.artifact_type == "terraform_template":
        art = artifact_generator.generate_terraform_template(
            template_type=req.template_subtype or "docker_infrastructure",
            incident_id=req.incident_id,
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported artifact type '{req.artifact_type}'.")

    # Run automatic static validation
    report = artifact_validator.validate_artifact(art.artifact_type, art.content)
    art.validation_status = report.status
    art.validation_errors = report.errors + [f"WARNING: {w}" for w in report.warnings]

    return art.to_dict()


@router.post("/{artifact_id}/validate")
def validate_artifact(artifact_id: str) -> Dict[str, Any]:
    """Run syntax and safety validator on an artifact."""
    art = artifact_generator.get_artifact(artifact_id)
    if not art:
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_id}' not found.")

    report = artifact_validator.validate_artifact(art.artifact_type, art.content)
    art.validation_status = report.status
    art.validation_errors = report.errors + [f"WARNING: {w}" for w in report.warnings]

    return {
        "artifact_id": art.id,
        "validation_report": report.to_dict(),
        "artifact": art.to_dict(),
    }


@router.post("/{artifact_id}/approve")
def approve_artifact(artifact_id: str, req: OperatorActionRequest) -> Dict[str, Any]:
    """Approve a generated configuration artifact."""
    art = artifact_generator.approve_artifact(artifact_id, req.operator_name)
    if not art:
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_id}' not found.")
    return {
        "status": "APPROVED",
        "artifact": art.to_dict(),
        "message": "Artifact approved by operator. Ready for manual deployment.",
    }


@router.post("/{artifact_id}/reject")
def reject_artifact(artifact_id: str, req: OperatorActionRequest) -> Dict[str, Any]:
    """Reject a generated configuration artifact."""
    art = artifact_generator.reject_artifact(artifact_id, req.operator_name)
    if not art:
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_id}' not found.")
    return {
        "status": "REJECTED",
        "artifact": art.to_dict(),
        "message": "Artifact rejected by operator.",
    }
