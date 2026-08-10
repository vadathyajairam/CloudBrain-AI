from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.app.core.remediation_engine import remediation_engine

router = APIRouter(prefix="/remediate", tags=["Remediation"])

class ExecuteActionRequest(BaseModel):
    action_id: str
    target_id: str
    action_type: str
    command: str

@router.post("/execute")
def execute_remediation_action(req: ExecuteActionRequest):
    try:
        return remediation_engine.execute_action(
            action_id=req.action_id,
            target_id=req.target_id,
            action_type=req.action_type,
            command=req.command
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/history")
def get_remediation_history():
    return {
        "history": remediation_engine.get_history()
    }
