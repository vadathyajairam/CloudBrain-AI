"""
telemetry_pipeline.py  —  Synexis Telemetry Pipeline

Orchestrates the full collection cycle every tick:
  1. Collect system metrics (psutil)
  2. Collect Docker container metrics
  3. Collect Docker logs
  4. Run detection rules
  5. Create / update incidents
  6. Auto-resolve cleared incidents

Called exclusively by the background_telemetry_loop in main.py.
"""
from __future__ import annotations

import time
from typing import Any

from backend.app.core.monitoring import monitoring_engine
from backend.app.core.container_engine import container_engine
from backend.app.core.log_engine import log_engine
from backend.app.core.detection_engine import detection_engine
from backend.app.core.incident_manager import incident_manager


class TelemetryPipeline:
    """
    Single coordinator for the full telemetry → detection → incident cycle.
    """

    def __init__(self) -> None:
        self._last_run: float = 0.0
        # Track which rule+service pairs were triggered last cycle
        # so we can auto-resolve on clear.
        self._prev_triggered: set[str] = set()

    def run_cycle(self) -> dict[str, Any]:
        """
        Execute one full pipeline cycle.
        Returns a summary dict for logging / WebSocket broadcasting.
        """
        t0 = time.time()

        # 1. Collect system metrics (in-memory + persisted by monitoring_engine)
        metrics = monitoring_engine.collect_snapshot()

        # 2. Collect Docker metrics + logs
        logs_ingested = log_engine.collect_from_docker(container_engine)
        containers = container_engine.list_containers()

        # 3. Run all detection rules
        results = detection_engine.run_all_rules()

        # 4. Determine triggered and cleared sets
        triggered_keys: set[str] = set()
        new_incidents = []

        for result in results:
            key = f"{result.rule_id}:{result.service}"
            triggered_keys.add(key)
            inc = incident_manager.create_or_update_incident(result)
            if inc:
                new_incidents.append(inc["id"])

        # 5. Auto-resolve incidents whose rules are no longer triggering
        cleared_keys = self._prev_triggered - triggered_keys
        resolved_ids = []
        for key in cleared_keys:
            rule_id, service = key.split(":", 1)
            if incident_manager.auto_resolve_if_clear(rule_id, service):
                resolved_ids.append(key)

        self._prev_triggered = triggered_keys
        self._last_run = time.time()

        return {
            "timestamp": metrics["iso_timestamp"],
            "cpu_percent": metrics["cpu"]["usage_percent"],
            "memory_percent": metrics["memory"]["usage_percent"],
            "health_score": metrics["health_score"],
            "status": metrics["status"],
            "containers_monitored": len(containers),
            "logs_ingested": logs_ingested,
            "rules_triggered": len(results),
            "new_incidents": new_incidents,
            "auto_resolved": resolved_ids,
            "cycle_ms": round((time.time() - t0) * 1000, 1),
        }


telemetry_pipeline = TelemetryPipeline()
