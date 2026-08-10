import time
import random
from typing import Dict, Any, Optional
from backend.app.core.container_engine import container_engine
from backend.app.core.log_engine import log_engine

CHAOS_SCENARIOS = {
    "retry_storm": {
        "id": "retry_storm",
        "title": "API Infinite Retry Storm (CPU Spike 94%)",
        "category": "Compute & Performance",
        "severity": "CRITICAL",
        "description": "Backend API client repeatedly hits a slow endpoint without exponential backoff, causing massive CPU saturation and thread contention.",
        "target_service": "cloudbrain-api-backend",
        "symptoms": [
            "CPU usage spikes from 14% to 94%",
            "High rate of HTTP 504 Gateway Timeouts",
            "Backend thread pool near exhaustion"
        ]
    },
    "db_pool_exhaustion": {
        "id": "db_pool_exhaustion",
        "title": "Database Connection Pool Saturation",
        "category": "Database & Reliability",
        "severity": "HIGH",
        "description": "Unclosed database sessions fill up Postgres MAX_CONNECTIONS pool (100/100), rejecting all new API backend queries.",
        "target_service": "postgres-primary-db",
        "symptoms": [
            "Database active connections: 100/100 (100%)",
            "Backend logs show 'FATAL: remaining connection slots reserved'",
            "API response latency jumps to > 8,500ms"
        ]
    },
    "memory_leak_oom": {
        "id": "memory_leak_oom",
        "title": "Memory Leak & OOM (Out-Of-Memory) Crash",
        "category": "Memory & Stability",
        "severity": "CRITICAL",
        "description": "Worker service leaks unbounded memory on file ingestion, hitting 1024MB ceiling and receiving SIGKILL from Linux OOM Killer.",
        "target_service": "cloudbrain-async-worker",
        "symptoms": [
            "Memory climbs rapidly from 290MB to 1,024MB",
            "Worker status transitions to 'unhealthy' / 'exited'",
            "Restart count increments automatically"
        ]
    },
    "port_collision": {
        "id": "port_collision",
        "title": "Host Port Collision (Port 8000 Occupied)",
        "category": "Networking & Deployment",
        "severity": "HIGH",
        "description": "New backend replica fails to bind to port 0.0.0.0:8000 because another zombie process is already listening.",
        "target_service": "cloudbrain-api-backend",
        "symptoms": [
            "Errno 98: Address already in use",
            "Container startup aborts with exit code 1",
            "Service deployment marked FAILED"
        ]
    },
    "crashloop_backoff": {
        "id": "crashloop_backoff",
        "title": "Missing Config Secret (CrashLoopBackOff)",
        "category": "Configuration & Secrets",
        "severity": "HIGH",
        "description": "Service crashes during boot because mandatory environment variable 'JWT_SECRET_KEY' is missing or empty.",
        "target_service": "cloudbrain-nextjs-ui",
        "symptoms": [
            "Container restarts 5 times within 60 seconds",
            "KeyError: 'JWT_SECRET_KEY is required in production'",
            "Frontend state displays DEGRADED"
        ]
    }
}

class ChaosEngine:
    def __init__(self):
        self.active_scenario: Optional[str] = None
        self.started_at: Optional[float] = None

    def get_scenarios(self) -> Dict[str, Any]:
        return {
            "active_scenario": self.active_scenario,
            "scenarios": list(CHAOS_SCENARIOS.values())
        }

    def trigger_scenario(self, scenario_id: str) -> Dict[str, Any]:
        if scenario_id not in CHAOS_SCENARIOS:
            raise ValueError(f"Unknown scenario '{scenario_id}'")

        self.active_scenario = scenario_id
        self.started_at = time.time()
        scenario = CHAOS_SCENARIOS[scenario_id]

        if scenario_id == "retry_storm":
            container_engine.mutate_for_chaos("c-backend", {
                "cpu_percent": 94.2,
                "memory_mb": 780.0,
                "state": "degraded"
            })
            for _ in range(8):
                log_engine.add_log("ERROR", "backend", "HTTP 504 Gateway Timeout on upstream service /v1/payments")
                log_engine.add_log("WARN", "backend", "API retry attempt 3/5 with 0ms delay (no exponential backoff configured)")
                log_engine.add_log("ERROR", "backend", "Thread starvation detected: 98/100 worker threads blocked on socket read")

        elif scenario_id == "db_pool_exhaustion":
            container_engine.mutate_for_chaos("c-database", {
                "cpu_percent": 88.5,
                "memory_mb": 1820.0,
                "state": "unhealthy"
            })
            for _ in range(6):
                log_engine.add_log("ERROR", "database", "FATAL: remaining connection slots are reserved for non-replication superuser connections")
                log_engine.add_log("ERROR", "backend", "psycopg2.OperationalError: could not connect to server: Connection timed out")
                log_engine.add_log("WARN", "database", "Connection pool exhausted: 100/100 active connections in 'idle in transaction' state")

        elif scenario_id == "memory_leak_oom":
            container_engine.mutate_for_chaos("c-worker", {
                "cpu_percent": 35.0,
                "memory_mb": 1024.0,
                "status": "stopped",
                "state": "exited",
                "restart_count": 3
            })
            log_engine.add_log("WARN", "worker", "Memory utilization exceeded 90% threshold (940MB / 1024MB)")
            log_engine.add_log("CRITICAL", "worker", "Kernel OOM-killer invoked: Killed process 8912 (celery worker) total-vm:1048576kB, anon-rss:1044480kB")
            log_engine.add_log("ERROR", "worker", "Container exited with status code 137 (SIGKILL OOM)")

        elif scenario_id == "port_collision":
            container_engine.mutate_for_chaos("c-backend", {
                "status": "stopped",
                "state": "exited",
                "cpu_percent": 0.0
            })
            log_engine.add_log("CRITICAL", "backend", "OSError: [Errno 98] Address already in use: '0.0.0.0:8000'")
            log_engine.add_log("ERROR", "backend", "Failed to bind socket. Another process (PID 4192) is listening on port 8000")
            log_engine.add_log("ERROR", "frontend", "Upstream API server unreachable at http://api:8000 (ECONNREFUSED)")

        elif scenario_id == "crashloop_backoff":
            container_engine.mutate_for_chaos("c-frontend", {
                "state": "unhealthy",
                "restart_count": 5,
                "cpu_percent": 2.0
            })
            for _ in range(5):
                log_engine.add_log("CRITICAL", "frontend", "RuntimeError: Environment variable 'JWT_SECRET_KEY' is missing in production mode")
                log_engine.add_log("WARN", "frontend", "Container restarting (backoff: 10s)")

        return {
            "status": "triggered",
            "scenario": scenario,
            "message": f"Injected chaos scenario: '{scenario['title']}'"
        }

    def reset_chaos(self) -> Dict[str, Any]:
        prev_scenario = self.active_scenario
        self.active_scenario = None
        self.started_at = None

        # Reset all containers to healthy defaults
        for cid in ["c-backend", "c-frontend", "c-database", "c-redis", "c-worker"]:
            container_engine.restart_container(cid)

        log_engine.clear_logs()
        log_engine.add_log("INFO", "backend", "System chaos resolved. Telemetry baselines restored to normal parameters.")
        log_engine.add_log("INFO", "database", "All connections cleared and operating within normal pool capacity (12/100).")
        log_engine.add_log("INFO", "worker", "Worker restarted cleanly with baseline memory footprint (240MB).")

        return {
            "status": "reset",
            "previous_scenario": prev_scenario,
            "message": "All failure scenarios cleared. Infrastructure operating normally."
        }

chaos_engine = ChaosEngine()
