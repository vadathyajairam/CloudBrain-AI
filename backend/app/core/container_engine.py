import time
import random
from typing import Dict, Any, List, Optional
from datetime import datetime

class ContainerEngine:
    def __init__(self):
        self.is_sandbox_mode = True # Default to sandbox demo mode, perfect for students & presentations
        self.containers: Dict[str, Dict[str, Any]] = {
            "c-backend": {
                "id": "c-backend",
                "name": "cloudbrain-api-backend",
                "image": "cloudbrain/api-gateway:v2.4.1",
                "status": "running",
                "state": "healthy",
                "cpu_percent": 14.5,
                "memory_mb": 420.0,
                "memory_limit_mb": 1024.0,
                "ports": ["8000:8000"],
                "restart_count": 0,
                "uptime": "3h 42m",
                "created_at": "2026-08-10T14:30:00Z",
                "env": {"PORT": "8000", "ENV": "production", "DB_POOL_SIZE": "20"},
                "healthcheck": "GET /api/v1/health -> 200 OK"
            },
            "c-frontend": {
                "id": "c-frontend",
                "name": "cloudbrain-nextjs-ui",
                "image": "cloudbrain/web-dashboard:v2.4.1",
                "status": "running",
                "state": "healthy",
                "cpu_percent": 6.2,
                "memory_mb": 210.0,
                "memory_limit_mb": 512.0,
                "ports": ["3000:3000"],
                "restart_count": 0,
                "uptime": "3h 42m",
                "created_at": "2026-08-10T14:30:00Z",
                "env": {"NEXT_PUBLIC_API_URL": "http://api:8000"},
                "healthcheck": "GET / -> 200 OK"
            },
            "c-database": {
                "id": "c-database",
                "name": "postgres-primary-db",
                "image": "postgres:16-alpine",
                "status": "running",
                "state": "healthy",
                "cpu_percent": 8.0,
                "memory_mb": 580.0,
                "memory_limit_mb": 2048.0,
                "ports": ["5432:5432"],
                "restart_count": 0,
                "uptime": "5d 12h",
                "created_at": "2026-08-05T08:00:00Z",
                "env": {"POSTGRES_DB": "cloudbrain", "MAX_CONNECTIONS": "100"},
                "healthcheck": "pg_isready -U postgres -> accepting connections"
            },
            "c-redis": {
                "id": "c-redis",
                "name": "redis-session-cache",
                "image": "redis:7.2-alpine",
                "status": "running",
                "state": "healthy",
                "cpu_percent": 2.1,
                "memory_mb": 95.0,
                "memory_limit_mb": 512.0,
                "ports": ["6379:6379"],
                "restart_count": 0,
                "uptime": "5d 12h",
                "created_at": "2026-08-05T08:00:00Z",
                "env": {"MAXMEMORY": "400mb", "MAXMEMORY_POLICY": "allkeys-lru"},
                "healthcheck": "redis-cli ping -> PONG"
            },
            "c-worker": {
                "id": "c-worker",
                "name": "cloudbrain-async-worker",
                "image": "cloudbrain/worker-celery:v2.4.1",
                "status": "running",
                "state": "healthy",
                "cpu_percent": 5.4,
                "memory_mb": 290.0,
                "memory_limit_mb": 1024.0,
                "ports": [],
                "restart_count": 0,
                "uptime": "3h 42m",
                "created_at": "2026-08-10T14:30:00Z",
                "env": {"CONCURRENCY": "4", "QUEUE": "high_priority,default"},
                "healthcheck": "celery inspect ping -> OK"
            }
        }

    def list_containers(self) -> List[Dict[str, Any]]:
        # Apply slight jitter to make live telemetry feel alive
        for cid, c in self.containers.items():
            if c["status"] == "running":
                # slight fluctuation unless artificially overridden by chaos
                if "chaos_locked" not in c or not c["chaos_locked"]:
                    delta = random.uniform(-0.8, 0.8)
                    c["cpu_percent"] = max(0.5, min(99.9, round(c["cpu_percent"] + delta, 1)))
        return list(self.containers.values())

    def get_container(self, container_id: str) -> Optional[Dict[str, Any]]:
        return self.containers.get(container_id)

    def restart_container(self, container_id: str) -> Dict[str, Any]:
        if container_id not in self.containers:
            raise ValueError(f"Container '{container_id}' not found")
        
        c = self.containers[container_id]
        c["status"] = "running"
        c["state"] = "healthy"
        c["restart_count"] += 1
        c["uptime"] = "just restarted (0m)"
        c["chaos_locked"] = False
        
        # Reset resource metrics to normal baseline
        if "backend" in c["name"]:
            c["cpu_percent"] = 12.0
            c["memory_mb"] = 380.0
        elif "database" in c["name"]:
            c["cpu_percent"] = 6.5
            c["memory_mb"] = 510.0
        elif "redis" in c["name"]:
            c["cpu_percent"] = 1.8
            c["memory_mb"] = 90.0
        else:
            c["cpu_percent"] = 5.0
            c["memory_mb"] = 200.0

        return {
            "status": "success",
            "message": f"Container '{c['name']}' restarted successfully",
            "container": c
        }

    def stop_container(self, container_id: str) -> Dict[str, Any]:
        if container_id not in self.containers:
            raise ValueError(f"Container '{container_id}' not found")
        
        c = self.containers[container_id]
        c["status"] = "stopped"
        c["state"] = "exited"
        c["cpu_percent"] = 0.0
        c["memory_mb"] = 0.0
        return {
            "status": "success",
            "message": f"Container '{c['name']}' stopped",
            "container": c
        }

    def start_container(self, container_id: str) -> Dict[str, Any]:
        if container_id not in self.containers:
            raise ValueError(f"Container '{container_id}' not found")
        
        c = self.containers[container_id]
        c["status"] = "running"
        c["state"] = "healthy"
        c["uptime"] = "0m"
        c["cpu_percent"] = 8.5
        c["memory_mb"] = 250.0
        return {
            "status": "success",
            "message": f"Container '{c['name']}' started",
            "container": c
        }

    def mutate_for_chaos(self, container_id: str, updates: Dict[str, Any]):
        if container_id in self.containers:
            self.containers[container_id].update(updates)
            self.containers[container_id]["chaos_locked"] = True

container_engine = ContainerEngine()
