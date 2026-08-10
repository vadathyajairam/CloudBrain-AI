import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.app.config import settings
from backend.app.core.monitoring import monitoring_engine
from backend.app.api.routes_metrics import router as metrics_router
from backend.app.api.routes_containers import router as containers_router
from backend.app.api.routes_logs import router as logs_router
from backend.app.api.routes_incidents import router as incidents_router
from backend.app.api.routes_rca import router as rca_router
from backend.app.api.routes_config import router as config_router
from backend.app.api.routes_chaos import router as chaos_router
from backend.app.api.routes_remediation import router as remediation_router
from backend.app.api.routes_assistant import router as assistant_router

# Background telemetry ticker
async def background_metrics_ticker():
    while True:
        try:
            monitoring_engine.collect_snapshot()
        except Exception as e:
            pass
        await asyncio.sleep(2.0)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    task = asyncio.create_task(background_metrics_ticker())
    yield
    # Shutdown
    task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CloudBrain AI - Intelligent Cloud Operations & DevOps Assistant API",
    lifespan=lifespan
)

# Enable CORS for Frontend Dev and Production
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API v1 routers
api_prefix = settings.API_V1_STR
app.include_router(metrics_router, prefix=api_prefix)
app.include_router(containers_router, prefix=api_prefix)
app.include_router(logs_router, prefix=api_prefix)
app.include_router(incidents_router, prefix=api_prefix)
app.include_router(rca_router, prefix=api_prefix)
app.include_router(config_router, prefix=api_prefix)
app.include_router(chaos_router, prefix=api_prefix)
app.include_router(remediation_router, prefix=api_prefix)
app.include_router(assistant_router, prefix=api_prefix)

@app.get("/")
def root_status():
    return {
        "system": "CloudBrain AI Backend",
        "status": "ONLINE",
        "version": settings.VERSION,
        "docs_url": "/docs"
    }

@app.get("/api/v1/health")
def health_check():
    latest = monitoring_engine.get_latest()
    return {
        "status": "healthy",
        "timestamp": latest["timestamp"],
        "health_score": latest["health_score"],
        "system_status": latest["status"]
    }
