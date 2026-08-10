from fastapi import APIRouter
from typing import Optional
from backend.app.core.log_engine import log_engine

router = APIRouter(prefix="/logs", tags=["Logs"])

@router.get("")
def get_logs(
    service: Optional[str] = "all",
    level: Optional[str] = "ALL",
    search: Optional[str] = None,
    limit: int = 100
):
    return {
        "logs": log_engine.get_logs(service=service, level=level, search=search, limit=limit)
    }

@router.get("/stats")
def get_log_stats():
    return log_engine.get_error_burst_stats()

@router.post("/clear")
def clear_logs():
    log_engine.clear_logs()
    return {"status": "cleared", "message": "Log buffer refreshed"}
