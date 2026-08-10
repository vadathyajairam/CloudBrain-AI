from fastapi import APIRouter
from pydantic import BaseModel
from backend.app.core.config_analyzer import config_analyzer, SAMPLE_CONFIGS

router = APIRouter(prefix="/config", tags=["Config Auditor"])

class AuditRequest(BaseModel):
    file_type: str # "docker-compose", "dockerfile", "k8s", "env"
    content: str

@router.post("/audit")
def audit_config_file(req: AuditRequest):
    return config_analyzer.audit_config(req.file_type, req.content)

@router.get("/samples")
def get_sample_configs():
    return {
        "samples": SAMPLE_CONFIGS
    }
