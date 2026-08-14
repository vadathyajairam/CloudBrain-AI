"""
detection_engine.py  —  Synexis Anomaly Detection Engine

Runs detection rules against real telemetry data.
Each rule inspects live metrics, container state, or logs and returns a
DetectionResult.  Triggered rules cause the IncidentManager to create or
update incidents in the database.

Rules:
  cpu_sustained_high      CPU > threshold for sustained period
  memory_high             Memory > threshold
  disk_high               Disk > threshold
  container_stopped       Container in exited/dead state
  container_unhealthy     Docker health check = unhealthy
  container_restart_loop  restart_count increased since last check
  error_log_burst         N+ errors in 30-second window
  app_health_failure      /health endpoint returns non-200
"""
from __future__ import annotations

import time
import threading
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, List, Optional

import httpx

from backend.app.config import settings
from backend.app.core.monitoring import monitoring_engine
from backend.app.core.container_engine import container_engine
from backend.app.core.log_engine import log_engine


# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class EvidenceItem:
    evidence_type: str          # METRIC | CONTAINER | LOG_TRACE | HEALTH
    source: str
    detail: str


@dataclass
class DetectionResult:
    rule_id: str
    triggered: bool
    severity: str               # LOW | MEDIUM | HIGH | CRITICAL
    title: str
    description: str
    service: str                # primary affected service / container
    container_id: str
    evidence: List[EvidenceItem] = field(default_factory=list)


# ── Port mapping for health checks ───────────────────────────────────────────
# Map sandbox container names to their exposed host ports.
_HEALTH_ENDPOINTS: dict[str, str] = {
    "synexis-demo-app": "http://localhost:5050/health",
    "cloudbrain-demo-app": "http://localhost:5050/health",
}


def _check_health_endpoint(url: str, timeout: float = 3.0) -> tuple[bool, int]:
    """GET a /health endpoint. Returns (ok, status_code)."""
    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.get(url)
        return resp.status_code < 400, resp.status_code
    except Exception:
        return False, 0


class DetectionEngine:
    """
    Runs all detection rules against current telemetry.
    Call `run_all_rules()` from the background telemetry loop.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        # Track CPU-high start time per instance for sustained check
        self._cpu_high_since: Optional[float] = None
        # Previous restart counts to detect increases
        self._prev_restart_counts: dict[str, int] = {}

    # ── Public API ────────────────────────────────────────────────────────────

    def run_all_rules(self) -> List[DetectionResult]:
        """
        Execute every detection rule and return a list of triggered results.
        Non-triggered rules are excluded from the return value.
        """
        metrics = monitoring_engine.get_latest()
        containers = container_engine.list_containers()
        burst_stats = log_engine.get_error_burst_stats()

        results: List[DetectionResult] = []

        # System-level rules
        cpu_result = self._rule_cpu_sustained_high(metrics)
        if cpu_result.triggered:
            results.append(cpu_result)

        mem_result = self._rule_memory_high(metrics)
        if mem_result.triggered:
            results.append(mem_result)

        disk_result = self._rule_disk_high(metrics)
        if disk_result.triggered:
            results.append(disk_result)

        # Log-based rules
        burst_result = self._rule_error_log_burst(burst_stats)
        if burst_result.triggered:
            results.append(burst_result)

        # Container-level rules
        for c in containers:
            stopped = self._rule_container_stopped(c)
            if stopped.triggered:
                results.append(stopped)

            unhealthy = self._rule_container_unhealthy(c)
            if unhealthy.triggered:
                results.append(unhealthy)

            restart = self._rule_container_restart_loop(c)
            if restart.triggered:
                results.append(restart)

        # Application health checks
        for cname, url in _HEALTH_ENDPOINTS.items():
            health = self._rule_app_health_failure(cname, url)
            if health.triggered:
                results.append(health)

        return results

    # ── Detection Rules ───────────────────────────────────────────────────────

    def _rule_cpu_sustained_high(self, metrics: dict[str, Any]) -> DetectionResult:
        cpu = metrics["cpu"]["usage_percent"]
        threshold = settings.CPU_ALERT_THRESHOLD
        sustained_sec = settings.CPU_SUSTAINED_SEC
        now = time.time()

        with self._lock:
            if cpu > threshold:
                if self._cpu_high_since is None:
                    self._cpu_high_since = now
                duration = now - self._cpu_high_since
                triggered = duration >= sustained_sec
            else:
                self._cpu_high_since = None
                triggered = False
                duration = 0

        evidence = []
        if triggered:
            evidence.append(EvidenceItem(
                evidence_type="METRIC",
                source="Local Machine / psutil",
                detail=f"CPU at {cpu}% for {int(duration)}s (threshold: >{threshold}% for >{sustained_sec}s)"
            ))
            cores = metrics["cpu"].get("cores_usage", [])
            hot_cores = [(i, v) for i, v in enumerate(cores) if v > threshold]
            if hot_cores:
                evidence.append(EvidenceItem(
                    evidence_type="METRIC",
                    source="Local Machine / psutil",
                    detail=f"Hot cores: {', '.join(f'Core{i}={v}%' for i, v in hot_cores[:4])}"
                ))

        return DetectionResult(
            rule_id="cpu_sustained_high",
            triggered=triggered,
            severity="HIGH",
            title=f"CPU Sustained High — {cpu}% for {int(duration)}s",
            description=f"System CPU utilisation has been above {threshold}% for over {int(duration)} seconds.",
            service="local-machine",
            container_id="",
            evidence=evidence,
        )

    def _rule_memory_high(self, metrics: dict[str, Any]) -> DetectionResult:
        mem = metrics["memory"]
        pct = mem["usage_percent"]
        threshold = settings.MEMORY_ALERT_THRESHOLD
        triggered = pct > threshold

        evidence = []
        if triggered:
            evidence.append(EvidenceItem(
                evidence_type="METRIC",
                source="Local Machine / psutil",
                detail=(
                    f"Memory at {pct}% — {mem['used_gb']}GB used of {mem['total_gb']}GB "
                    f"(threshold: >{threshold}%)"
                )
            ))
            if mem.get("swap_percent", 0) > 50:
                evidence.append(EvidenceItem(
                    evidence_type="METRIC",
                    source="Local Machine / psutil",
                    detail=f"Swap in use: {mem['swap_percent']}% — system is paging"
                ))

        return DetectionResult(
            rule_id="memory_high",
            triggered=triggered,
            severity="HIGH",
            title=f"Memory High — {pct}%",
            description=f"System memory usage has exceeded {threshold}%.",
            service="local-machine",
            container_id="",
            evidence=evidence,
        )

    def _rule_disk_high(self, metrics: dict[str, Any]) -> DetectionResult:
        disk = metrics["disk"]
        pct = disk["usage_percent"]
        threshold = settings.DISK_ALERT_THRESHOLD
        triggered = pct > threshold

        evidence = []
        if triggered:
            evidence.append(EvidenceItem(
                evidence_type="METRIC",
                source="Local Machine / psutil",
                detail=(
                    f"Disk at {pct}% — {disk['used_gb']}GB used, "
                    f"{disk['free_gb']}GB free of {disk['total_gb']}GB"
                )
            ))

        return DetectionResult(
            rule_id="disk_high",
            triggered=triggered,
            severity="MEDIUM",
            title=f"Disk Space High — {pct}%",
            description=f"Disk usage has exceeded {threshold}%.",
            service="local-machine",
            container_id="",
            evidence=evidence,
        )

    def _rule_container_stopped(self, c: dict[str, Any]) -> DetectionResult:
        stopped = c["status"] in ("exited", "dead", "removing")
        evidence = []
        if stopped:
            evidence.append(EvidenceItem(
                evidence_type="CONTAINER",
                source=c["name"],
                detail=f"Container '{c['name']}' status: {c['status']} (expected: running)"
            ))

        return DetectionResult(
            rule_id="container_stopped",
            triggered=stopped,
            severity="CRITICAL",
            title=f"Container Stopped — {c['name']}",
            description=f"Container '{c['name']}' is in state '{c['status']}' and is not running.",
            service=c["name"],
            container_id=c["id"],
            evidence=evidence,
        )

    def _rule_container_unhealthy(self, c: dict[str, Any]) -> DetectionResult:
        unhealthy = c["state"] == "unhealthy"
        evidence = []
        if unhealthy:
            evidence.append(EvidenceItem(
                evidence_type="HEALTH",
                source=c["name"],
                detail=f"Docker health check reports '{c['name']}' as UNHEALTHY"
            ))
            evidence.append(EvidenceItem(
                evidence_type="CONTAINER",
                source=c["name"],
                detail=f"CPU: {c['cpu_percent']}%, Memory: {c['memory_mb']}MB/{c['memory_limit_mb']}MB"
            ))

        return DetectionResult(
            rule_id="container_unhealthy",
            triggered=unhealthy,
            severity="HIGH",
            title=f"Container Unhealthy — {c['name']}",
            description=f"Container '{c['name']}' Docker health check is failing.",
            service=c["name"],
            container_id=c["id"],
            evidence=evidence,
        )

    def _rule_container_restart_loop(self, c: dict[str, Any]) -> DetectionResult:
        cid = c["id"]
        current = c.get("restart_count", 0)
        prev = self._prev_restart_counts.get(cid, 0)

        # Update tracking
        self._prev_restart_counts[cid] = current

        # Trigger if restart_count >= 3 AND increased since last check
        triggered = current >= 3 and current > prev

        evidence = []
        if triggered:
            evidence.append(EvidenceItem(
                evidence_type="CONTAINER",
                source=c["name"],
                detail=f"Container '{c['name']}' has restarted {current} times (was {prev} on last check)"
            ))

        return DetectionResult(
            rule_id="container_restart_loop",
            triggered=triggered,
            severity="HIGH",
            title=f"Container Restart Loop — {c['name']} ({current} restarts)",
            description=f"Container '{c['name']}' is in a restart loop with {current} restarts.",
            service=c["name"],
            container_id=c["id"],
            evidence=evidence,
        )

    def _rule_error_log_burst(self, burst_stats: dict[str, Any]) -> DetectionResult:
        count_30s = burst_stats.get("errors_last_30s", 0)
        threshold = settings.ERROR_BURST_COUNT
        triggered = count_30s >= threshold

        evidence = []
        if triggered:
            evidence.append(EvidenceItem(
                evidence_type="LOG_TRACE",
                source="LogEngine",
                detail=(
                    f"{count_30s} errors in last 30s (threshold: {threshold}). "
                    f"Total errors: {burst_stats.get('total_errors', 0)}, "
                    f"Total logs: {burst_stats.get('total_logs', 0)}"
                )
            ))

        return DetectionResult(
            rule_id="error_log_burst",
            triggered=triggered,
            severity="HIGH",
            title=f"Error Log Burst — {count_30s} errors in 30s",
            description=f"Error rate exceeded threshold: {count_30s} errors in the last 30 seconds.",
            service="log-engine",
            container_id="",
            evidence=evidence,
        )

    def _rule_app_health_failure(self, container_name: str, url: str) -> DetectionResult:
        ok, status_code = _check_health_endpoint(url)
        triggered = not ok

        evidence = []
        if triggered:
            detail = f"GET {url} → {status_code if status_code else 'connection refused'}"
            evidence.append(EvidenceItem(
                evidence_type="HEALTH",
                source=container_name,
                detail=detail
            ))

        return DetectionResult(
            rule_id="app_health_failure",
            triggered=triggered,
            severity="HIGH",
            title=f"Application Health Failure — {container_name}",
            description=f"Health endpoint {url} is not returning 200.",
            service=container_name,
            container_id="",
            evidence=evidence,
        )


detection_engine = DetectionEngine()
