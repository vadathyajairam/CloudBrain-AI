import time
import psutil
from datetime import datetime
from collections import deque
from typing import Dict, Any, List
import threading

class MonitoringEngine:
    def __init__(self, max_history: int = 120):
        self.max_history = max_history
        self.history: deque = deque(maxlen=max_history)
        self.lock = threading.Lock()
        self._last_net_io = psutil.net_io_counters()
        self._last_net_time = time.time()
        
        # Initial data point
        self.collect_snapshot()

    def collect_snapshot(self) -> Dict[str, Any]:
        with self.lock:
            now = datetime.now()
            timestamp = now.strftime("%H:%M:%S")
            iso_timestamp = now.isoformat()
            
            # CPU
            cpu_percent = psutil.cpu_percent(interval=None)
            per_cpu = psutil.cpu_percent(interval=None, percpu=True)
            
            # Memory
            mem = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            # Disk
            try:
                disk = psutil.disk_usage('C:\\' if psutil.WINDOWS else '/')
            except Exception:
                disk = psutil.disk_usage('.')
                
            # Network rate calculation
            curr_net_io = psutil.net_io_counters()
            curr_time = time.time()
            dt = max(curr_time - self._last_net_time, 0.001)
            
            bytes_sent_sec = (curr_net_io.bytes_sent - self._last_net_io.bytes_sent) / dt
            bytes_recv_sec = (curr_net_io.bytes_recv - self._last_net_io.bytes_recv) / dt
            
            self._last_net_io = curr_net_io
            self._last_net_time = curr_time
            
            # Process overview
            process_count = len(psutil.pids())
            
            # Health determination
            status = "HEALTHY"
            if cpu_percent > 85 or mem.percent > 90:
                status = "CRITICAL"
            elif cpu_percent > 70 or mem.percent > 75:
                status = "DEGRADED"

            # Aggregate health score (100 = perfect, 0 = crashed)
            cpu_penalty = max(0, cpu_percent - 50) * 0.8
            mem_penalty = max(0, mem.percent - 50) * 0.8
            disk_penalty = max(0, disk.percent - 80) * 0.5
            health_score = max(5, int(100 - (cpu_penalty + mem_penalty + disk_penalty)))

            snapshot = {
                "timestamp": timestamp,
                "iso_timestamp": iso_timestamp,
                "status": status,
                "health_score": health_score,
                "cpu": {
                    "usage_percent": round(cpu_percent, 1),
                    "cores_usage": [round(c, 1) for c in per_cpu],
                    "core_count": psutil.cpu_count(logical=True),
                    "physical_core_count": psutil.cpu_count(logical=False) or psutil.cpu_count(logical=True),
                },
                "memory": {
                    "total_gb": round(mem.total / (1024 ** 3), 2),
                    "used_gb": round(mem.used / (1024 ** 3), 2),
                    "available_gb": round(mem.available / (1024 ** 3), 2),
                    "usage_percent": round(mem.percent, 1),
                    "swap_percent": round(swap.percent, 1),
                },
                "disk": {
                    "total_gb": round(disk.total / (1024 ** 3), 2),
                    "used_gb": round(disk.used / (1024 ** 3), 2),
                    "free_gb": round(disk.free / (1024 ** 3), 2),
                    "usage_percent": round(disk.percent, 1),
                },
                "network": {
                    "upload_kbps": round(bytes_sent_sec / 1024, 1),
                    "download_kbps": round(bytes_recv_sec / 1024, 1),
                    "total_sent_mb": round(curr_net_io.bytes_sent / (1024 ** 2), 1),
                    "total_recv_mb": round(curr_net_io.bytes_recv / (1024 ** 2), 1),
                },
                "processes": {
                    "count": process_count
                }
            }
            
            self.history.append(snapshot)
            return snapshot

    def get_latest(self) -> Dict[str, Any]:
        if not self.history:
            return self.collect_snapshot()
        return self.history[-1]

    def get_history(self, limit: int = 60) -> List[Dict[str, Any]]:
        with self.lock:
            items = list(self.history)
            return items[-limit:] if limit > 0 else items

monitoring_engine = MonitoringEngine()
