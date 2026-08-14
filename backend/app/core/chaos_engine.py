"""
chaos_engine.py  —  Real Chaos Sandbox for Synexis

Operates ONLY on the synexis-* sandbox containers.

Chaos scenarios work by:
  1. Calling the demo-app's /chaos/* HTTP endpoints (cpu, errors, memory, slow)
     so that real container behaviour changes and real logs are emitted.
  2. Optionally stopping a sandbox container via Docker SDK for scenarios
     that specifically simulate a stopped service.

No fake telemetry is injected.  Real Docker → real metrics → real detection.
"""
from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from backend.app.config import settings
from backend.app.core.container_engine import container_engine
from backend.app.core.log_engine import log_engine

# ── Scenario catalogue ────────────────────────────────────────────────────────
CHAOS_SCENARIOS: dict[str, dict[str, Any]] = {
    "cpu_stress": {
        "id": "cpu_stress",
        "title": "CPU Stress — Demo App Overload",
        "category": "Compute & Performance",
        "severity": "HIGH",
        "description": (
            "Triggers CPU-intensive spin loops inside the demo-app container. "
            "Docker reports rising CPU utilisation. Synexis detection "
            "engine fires if it stays above the configured threshold."
        ),
        "target_service": "synexis-demo-app",
        "action": "http_cpu",
        "symptoms": [
            "synexis-demo-app CPU climbs toward 100%",
            "Demo-app logs show CHAOS INJECTED: CPU stress",
            "Synexis detection fires cpu_sustained_high rule",
        ],
    },
    "error_burst": {
        "id": "error_burst",
        "title": "Error Log Burst — Database Connection Failure",
        "category": "Database & Reliability",
        "severity": "HIGH",
        "description": (
            "Switches the demo-app into error-injection mode. All API routes "
            "return 5xx responses and emit connection-error logs. "
            "Synexis log engine classifies these as ERROR/CRITICAL and the "
            "detection engine fires the error_burst rule."
        ),
        "target_service": "synexis-demo-app",
        "action": "http_errors",
        "symptoms": [
            "Demo-app API routes return 503/500",
            "Logs show psycopg2 OperationalError, FATAL connection errors",
            "Synexis detection fires error_burst rule",
        ],
    },
    "memory_pressure": {
        "id": "memory_pressure",
        "title": "Memory Pressure — Gradual Leak",
        "category": "Memory & Stability",
        "severity": "HIGH",
        "description": (
            "Triggers the demo-app to allocate large byte arrays, simulating a "
            "memory leak. Docker reports rising container memory. "
            "Logs show OOM-killer warnings."
        ),
        "target_service": "synexis-demo-app",
        "action": "http_memory",
        "symptoms": [
            "synexis-demo-app memory climbs",
            "Logs show memory utilization exceeded 80% threshold",
            "On repeated triggers: OOM-killer log appears",
        ],
    },
    "slow_responses": {
        "id": "slow_responses",
        "title": "Slow Responses — Artificial Latency",
        "category": "Networking & Performance",
        "severity": "MEDIUM",
        "description": (
            "Adds 2–6 s artificial latency to every API response inside the "
            "demo-app. Logs report slow query warnings."
        ),
        "target_service": "synexis-demo-app",
        "action": "http_slow",
        "symptoms": [
            "Demo-app API latency 2–6 seconds",
            "Logs show slow query warnings",
        ],
    },
    "db_stop": {
        "id": "db_stop",
        "title": "Database Stopped — Container Failure",
        "category": "Database & Reliability",
        "severity": "CRITICAL",
        "description": (
            "Stops the database container via Docker SDK. "
            "Synexis detection engine fires the container_stopped rule "
            "within 5–10 seconds and creates a CRITICAL incident."
        ),
        "target_service": "synexis-postgres",
        "action": "docker_stop",
        "symptoms": [
            "synexis-postgres status: exited",
            "Synexis detection fires container_stopped rule",
            "Incident created with severity CRITICAL",
        ],
    },
}


class ChaosEngine:
    def __init__(self) -> None:
        self.active_scenario: Optional[str] = None
        self.started_at: Optional[float] = None
        self._demo_url: str = settings.SANDBOX_DEMO_URL  # e.g. http://localhost:5050

    # ── Public API ────────────────────────────────────────────────────────────

    def get_scenarios(self) -> dict[str, Any]:
        return {
            "active_scenario": self.active_scenario,
            "scenarios": list(CHAOS_SCENARIOS.values()),
        }

    def trigger_scenario(self, scenario_id: str) -> dict[str, Any]:
        if scenario_id not in CHAOS_SCENARIOS:
            raise ValueError(f"Unknown scenario '{scenario_id}'")

        scenario = CHAOS_SCENARIOS[scenario_id]
        action = scenario["action"]

        self.active_scenario = scenario_id
        self.started_at = time.time()
        result_detail: str = ""

        # ── HTTP-based chaos (demo-app endpoints) ─────────────────────────────
        if action == "http_cpu":
            result_detail = self._call_demo_chaos("/chaos/cpu")

        elif action == "http_errors":
            result_detail = self._call_demo_chaos("/chaos/errors")

        elif action == "http_memory":
            result_detail = self._call_demo_chaos("/chaos/memory")

        elif action == "http_slow":
            result_detail = self._call_demo_chaos("/chaos/slow")

        # ── Docker-based chaos (real container lifecycle) ─────────────────────
        elif action == "docker_stop":
            target = scenario["target_service"]
            try:
                container_engine.stop_container(target)
                result_detail = f"Container '{target}' stopped via Docker SDK."
            except Exception as exc:
                result_detail = f"Docker stop attempted: {exc}"

        # Write a system log entry so detection engine can pick it up
        log_engine.add_log(
            "INFO",
            scenario["target_service"],
            f"[CHAOS] Scenario '{scenario['title']}' injected at {datetime.now(timezone.utc).isoformat()}",
            metadata={"source": "chaos_engine", "scenario_id": scenario_id},
        )

        return {
            "status": "triggered",
            "scenario": scenario,
            "detail": result_detail,
            "started_at": self.started_at,
            "message": f"Chaos scenario '{scenario['title']}' is now active.",
        }

    def reset_chaos(self) -> dict[str, Any]:
        prev = self.active_scenario
        prev_scenario = CHAOS_SCENARIOS.get(prev, {}) if prev else {}
        self.active_scenario = None
        self.started_at = None

        results: list[str] = []

        # 1. Reset demo-app chaos (always safe to call)
        results.append(self._call_demo_chaos("/chaos/reset"))

        # 2. Start any container that was stopped by a docker_stop scenario
        if prev_scenario.get("action") == "docker_stop":
            target = prev_scenario.get("target_service", "")
            if target:
                try:
                    container_engine.start_container(target)
                    results.append(f"Container '{target}' started.")
                except Exception as exc:
                    results.append(f"Could not start '{target}': {exc}")

        # 3. Clear in-memory log buffer so stale errors do not linger
        log_engine.clear_logs()

        return {
            "status": "reset",
            "previous_scenario": prev,
            "results": results,
            "message": "All chaos scenarios cleared. Containers restoring to normal.",
        }

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _call_demo_chaos(self, path: str) -> str:
        """POST to the demo-app container's chaos endpoint."""
        url = f"{self._demo_url}{path}"
        try:
            with httpx.Client(timeout=5.0) as client:
                resp = client.post(url)
            if resp.status_code < 400:
                return f"POST {url} → {resp.status_code} OK"
            return f"POST {url} → {resp.status_code} {resp.text[:120]}"
        except httpx.ConnectError:
            return f"Demo-app unreachable at {url} (is the sandbox running?)"
        except Exception as exc:
            return f"HTTP call failed: {exc}"


chaos_engine = ChaosEngine()
