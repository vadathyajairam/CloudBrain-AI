"""
main.py  —  Synexis Platform FastAPI Server
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.core.rag_engine import rag_engine
from backend.app.core.telemetry_pipeline import telemetry_pipeline

from backend.app.api.routes_metrics import router as metrics_router
from backend.app.api.routes_containers import router as containers_router
from backend.app.api.routes_logs import router as logs_router
from backend.app.api.routes_incidents import router as incidents_router
from backend.app.api.routes_rca import router as rca_router
from backend.app.api.routes_rag import router as rag_router
from backend.app.api.routes_config import router as config_router
from backend.app.api.routes_chaos import router as chaos_router
from backend.app.api.routes_remediation import router as remediation_router
from backend.app.api.routes_assistant import router as assistant_router
from backend.app.api.routes_environments import router as environments_router


# ── Unified background telemetry loop ─────────────────────────────────────────
async def background_telemetry_loop():
    """
    Full pipeline cycle every 3 seconds:
      Collect host metrics → Collect Docker metrics → Collect Docker logs
      → Run detection rules → Create/update incidents → Auto-resolve cleared
    """
    while True:
        try:
            telemetry_pipeline.run_cycle()
        except Exception:
            pass
        await asyncio.sleep(3.0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialise database tables
    init_db()
    # Seed default RAG runbooks
    rag_engine.initialize()
    # Start background telemetry pipeline
    task = asyncio.create_task(background_telemetry_loop())
    yield
    # Shutdown
    task.cancel()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Synexis – Intelligent System Analysis and Automation Platform API",
    lifespan=lifespan,
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API v1 routers
api_prefix = settings.API_V1_STR
app.include_router(metrics_router,       prefix=api_prefix)
app.include_router(containers_router,    prefix=api_prefix)
app.include_router(logs_router,          prefix=api_prefix)
app.include_router(incidents_router,     prefix=api_prefix)
app.include_router(rca_router,           prefix=api_prefix)
app.include_router(rag_router,           prefix=api_prefix)
app.include_router(config_router,        prefix=api_prefix)
app.include_router(chaos_router,         prefix=api_prefix)
app.include_router(remediation_router,   prefix=api_prefix)
app.include_router(assistant_router,     prefix=api_prefix)
app.include_router(environments_router,  prefix=api_prefix)


@app.get("/")
def root_status():
    return {
        "system": "Synexis Backend",
        "status": "ONLINE",
        "version": settings.VERSION,
        "docs_url": "/docs",
    }


@app.get("/api/v1/health")
def health_check():
    from backend.app.core.monitoring import monitoring_engine
    latest = monitoring_engine.get_latest()
    from backend.app.core.container_engine import container_engine
    docker_info = container_engine.docker_info()
    rag_stats = rag_engine.get_stats()
    return {
        "status": "healthy",
        "timestamp": latest.get("iso_timestamp"),
        "health_score": latest.get("health_score"),
        "system_status": latest.get("status"),
        "docker_connected": docker_info.get("docker_available", False),
        "database": "connected",
        "rag_status": rag_stats.get("status", "ready"),
        "rag_documents": rag_stats.get("total_documents", 0),
    }
