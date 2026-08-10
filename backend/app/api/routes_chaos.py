from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.app.core.chaos_engine import chaos_engine

router = APIRouter(prefix="/chaos", tags=["Chaos Sandbox"])

class TriggerRequest(BaseModel):
    scenario_id: str

@router.get("/scenarios")
def get_scenarios():
    return chaos_engine.get_scenarios()

@router.post("/trigger")
def trigger_scenario(req: TriggerRequest):
    try:
        return chaos_engine.trigger_scenario(req.scenario_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/reset")
def reset_chaos():
    return chaos_engine.reset_chaos()
