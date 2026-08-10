import time
import random
import threading
from datetime import datetime
from collections import deque
from typing import List, Dict, Any, Optional

class LogEngine:
    def __init__(self, max_buffer: int = 500):
        self.max_buffer = max_buffer
        self.logs: deque = deque(maxlen=max_buffer)
        self.lock = threading.Lock()
        self._seed_initial_logs()

    def _seed_initial_logs(self):
        services = ["backend", "frontend", "database", "redis", "worker"]
        sample_messages = [
            ("INFO", "backend", "HTTP GET /api/v1/health 200 OK - 1.2ms"),
            ("INFO", "backend", "Processed batch metrics sync - 48 records"),
            ("INFO", "frontend", "Client connection established from 192.168.1.45"),
            ("INFO", "database", "Checkpoint complete: wrote 42 buffers (0.1%)"),
            ("INFO", "redis", "DB 0: 1,420 keys (14 volatile) in 2,048 slots"),
            ("INFO", "worker", "Task cloudbrain.tasks.telemetry_rollup[8a7b] succeeded in 0.04s"),
            ("INFO", "backend", "JWT token verified for subject usr_dev_099"),
            ("INFO", "database", "Vacuum analyze completed for table 'telemetry_metrics'"),
            ("INFO", "frontend", "Rendered /dashboard SSR component in 14ms"),
            ("INFO", "backend", "HTTP POST /api/v1/metrics 201 Created - 3.4ms")
        ]
        
        now = datetime.now()
        for i, (level, service, msg) in enumerate(sample_messages):
            t = datetime.fromtimestamp(now.timestamp() - (len(sample_messages) - i) * 3)
            self.logs.append({
                "id": f"log-{int(t.timestamp() * 1000)}-{i}",
                "timestamp": t.strftime("%H:%M:%S"),
                "iso_timestamp": t.isoformat(),
                "level": level,
                "service": service,
                "message": msg,
                "metadata": {"trace_id": f"trc-{random.randint(10000, 99999)}"}
            })

    def add_log(self, level: str, service: str, message: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        with self.lock:
            now = datetime.now()
            entry = {
                "id": f"log-{int(now.timestamp() * 1000)}-{random.randint(100, 999)}",
                "timestamp": now.strftime("%H:%M:%S"),
                "iso_timestamp": now.isoformat(),
                "level": level.upper(),
                "service": service,
                "message": message,
                "metadata": metadata or {"trace_id": f"trc-{random.randint(10000, 99999)}"}
            }
            self.logs.append(entry)
            return entry

    def get_logs(
        self,
        service: Optional[str] = None,
        level: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        with self.lock:
            result = list(self.logs)
            
            if service and service.lower() != "all":
                result = [l for l in result if l["service"].lower() == service.lower()]
                
            if level and level.upper() != "ALL":
                result = [l for l in result if l["level"].upper() == level.upper()]
                
            if search and search.strip():
                query = search.strip().lower()
                result = [
                    l for l in result
                    if query in l["message"].lower() or query in l["service"].lower() or query in l["level"].lower()
                ]
                
            return result[-limit:]

    def get_error_burst_stats(self) -> Dict[str, Any]:
        with self.lock:
            recent_logs = list(self.logs)[-50:]
            errors = [l for l in recent_logs if l["level"] in ("ERROR", "CRITICAL")]
            warnings = [l for l in recent_logs if l["level"] == "WARN"]
            
            error_patterns: Dict[str, int] = {}
            for e in errors:
                # normalize message to find patterns
                msg_prefix = e["message"][:45]
                error_patterns[msg_prefix] = error_patterns.get(msg_prefix, 0) + 1

            return {
                "recent_error_count": len(errors),
                "recent_warning_count": len(warnings),
                "top_patterns": sorted(
                    [{"pattern": k, "count": v} for k, v in error_patterns.items()],
                    key=lambda x: x["count"],
                    reverse=True
                )
            }

    def clear_logs(self):
        with self.lock:
            self.logs.clear()
            self._seed_initial_logs()

log_engine = LogEngine()
