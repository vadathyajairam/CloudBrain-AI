import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    PROJECT_NAME: str = "CloudBrain AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "127.0.0.1")
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*"
    ]
    # AI Engine settings
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "hybrid") # "hybrid", "gemini", "openai", "local"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Telemetry buffer size (number of data points)
    METRICS_HISTORY_POINTS: int = 120
    LOGS_MAX_BUFFER: int = 500

settings = Settings()
