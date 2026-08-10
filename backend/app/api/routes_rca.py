from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from backend.app.core.ai_rca_engine import ai_rca_engine

router = APIRouter(prefix="/analyze", tags=["AI RCA"])

class RCARequest(BaseModel):
    custom_context: Optional[str] = None

@router.post("/rca")
def perform_rca(req: Optional[RCARequest] = None):
    context = req.custom_context if req else None
    return ai_rca_engine.analyze_incident(custom_context=context)
