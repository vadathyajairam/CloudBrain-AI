from fastapi import APIRouter
from backend.app.core.monitoring import monitoring_engine

router = APIRouter(prefix="/metrics", tags=["Metrics"])

@router.get("/live")
def get_live_metrics():
    return monitoring_engine.collect_snapshot()

@router.get("/history")
def get_metrics_history(limit: int = 60):
    return {
        "count": limit,
        "history": monitoring_engine.get_history(limit=limit)
    }
