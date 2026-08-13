"""
config.py  —  Synexis Platform Configuration
"""
from __future__ import annotations

import os
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


class Settings(BaseModel):
    PROJECT_NAME: str = "Synexis"
    PROJECT_TITLE: str = "Synexis – Intelligent System Analysis and Automation Platform"
    VERSION: str = "2.5.0"
    API_V1_STR: str = "/api/v1"
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "127.0.0.1")
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*",
    ]

    # ── Database (PostgreSQL with SQLite fallback for instant zero-config dev) ──
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./synexis.db")

    # ── Sandbox ───────────────────────────────────────────
    SANDBOX_DEMO_URL: str = os.getenv("SANDBOX_DEMO_URL", "http://localhost:5050")
    SANDBOX_CONTAINER_PREFIX: str = "synexis-"
    ALLOWED_CONTAINER_PREFIXES: list[str] = ["synexis-"]

    # ── AI Engines (Optional) ─────────────────────────────
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # ── Telemetry & Logs ──────────────────────────────────
    METRICS_HISTORY_POINTS: int = 120
    LOGS_MAX_BUFFER: int = 500

    # ── Detection Thresholds ──────────────────────────────
    CPU_ALERT_THRESHOLD: float = 90.0        # percent
    MEMORY_ALERT_THRESHOLD: float = 90.0     # percent
    DISK_ALERT_THRESHOLD: float = 90.0       # percent
    ERROR_BURST_COUNT: int = 5               # errors within window
    ERROR_BURST_WINDOW_SEC: int = 30         # seconds
    CPU_SUSTAINED_SEC: int = 60              # seconds above threshold


settings = Settings()
