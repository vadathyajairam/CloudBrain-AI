"""
log_engine.py  —  Real Docker Log Collection (Stage 2)

Collects log lines from running sandbox containers via Docker SDK.
Classifies each line by severity using regex rules.
Provides an in-memory ring buffer with search / filter capabilities.

Key principle: the buffer is empty until containers produce real logs.
Empty buffer → [] response — that is the honest, correct behaviour.
"""
from __future__ import annotations

import hashlib
import re
import threading
import time
import uuid
from collections import deque
from datetime import datetime
from typing import Any

# ── Severity classification rules (first match wins) ─────────────────────────
_LEVEL_RULES: list[tuple[re.Pattern, str]] = [
    (
        re.compile(
            r"\b(oom.kill|oom-killer|sigkill|sigterm|panic|fatal error|"
            r"out of memory|killed process|exit code 137|kernel oom)\b",
            re.I,
        ),
        "CRITICAL",
    ),
    (
        re.compile(
            r"\b(error|exception|failed|failure|fatal|traceback|"
            r"stderr|unhandled|crash|abort|refused|unreachable)\b",
            re.I,
        ),
        "ERROR",
    ),
    (
        re.compile(
            r"\b(warn|warning|deprecated|timeout|slow.query|slow query|"
            r"high latency|retry|reconnect|degraded)\b",
            re.I,
        ),
        "WARN",
    ),
    (
        re.compile(r"\b(debug|trace|verbose)\b", re.I),
        "DEBUG",
    ),
]

# Docker timestamp prefix: "2024-01-15T10:23:45.123456789Z "
_DOCKER_TS_RE = re.compile(
    r"^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.\d+Z\s+(.*)", re.DOTALL
)


def _classify(message: str) -> str:
    for pattern, level in _LEVEL_RULES:
        if pattern.search(message):
            return level
    return "INFO"


def _parse_docker_line(raw: str) -> tuple[str, str]:
    """Split raw Docker log line into (timestamp, message)."""
    m = _DOCKER_TS_RE.match(raw.strip())
    if m:
        ts = m.group(1).replace("T", " ")
        msg = m.group(2).strip()
        return ts, msg
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S"), raw.strip()


def _line_fingerprint(container_id: str, raw_line: str) -> str:
    """Stable key used to deduplicate log lines across polling cycles."""
    return hashlib.md5(f"{container_id}:{raw_line}".encode(), usedforsecurity=False).hexdigest()


class LogEngine:
    """
    In-memory ring buffer for container log entries.

    Population:
      - Docker container logs  → ingest via collect_from_docker()
      - Chaos injection        → add_log() (explicit level, used by chaos engine)

    Retrieval:
      - get_logs()             → filtered, newest-first list
      - get_error_burst_stats() → stats for the incident detection engine
    """

    def __init__(self, max_buffer: int = 500) -> None:
        self._buffer: deque[dict[str, Any]] = deque(maxlen=max_buffer)
        self._err_timestamps: deque[float] = deque(maxlen=2000)
        self._lock = threading.Lock()
        # {container_id: unix_timestamp_float} — tracks last successful collection
        self._last_collected: dict[str, float] = {}
        # {fingerprint} — seen log line hashes (capped to avoid unbounded growth)
        self._seen: set[str] = set()
        self._seen_cap = max_buffer * 3

    # ── Docker log ingestion ──────────────────────────────

    def collect_from_docker(self, container_engine: Any) -> int:
        """
        Poll each running sandbox container for new log lines.
        Deduplicates using (container_id + raw_line) fingerprinting.
        Returns total lines ingested this cycle.
        """
        containers = container_engine.list_containers()
        total = 0
        for c in containers:
            if c.get("status") not in ("running", "restarting"):
                continue
            name = c["name"]
            cid = c["id"]
            since = self._last_collected.get(cid, 0.0)
            raw_lines = container_engine.get_container_logs_since(name, since=since, tail=80)
            if raw_lines:
                ingested = self._ingest_lines(name, cid, raw_lines)
                total += ingested
                self._last_collected[cid] = time.time()
        return total

    def _ingest_lines(self, container_name: str, container_id: str, raw_lines: list[str]) -> int:
        count = 0
        with self._lock:
            for raw in raw_lines:
                if not raw.strip():
                    continue
                fp = _line_fingerprint(container_id, raw)
                if fp in self._seen:
                    continue
                # Evict old fingerprints if cap reached
                if len(self._seen) >= self._seen_cap:
                    self._seen.clear()
                self._seen.add(fp)

                ts, message = _parse_docker_line(raw)
                if not message:
                    continue
                level = _classify(message)
                entry: dict[str, Any] = {
                    "id": str(uuid.uuid4())[:8],
                    "timestamp": ts,
                    "iso_timestamp": ts,
                    "level": level,
                    "service": container_name,
                    "container_id": container_id,
                    "message": message[:800],
                    "metadata": {"source": "docker_logs"},
                }
                self._buffer.append(entry)
                if level in ("ERROR", "CRITICAL"):
                    self._err_timestamps.append(time.time())
                count += 1
        return count

    # ── Programmatic log injection ────────────────────────

    def add_log(
        self,
        level: str,
        service: str,
        message: str,
        metadata: dict[str, Any] | None = None,
        container_id: str = "",
    ) -> dict[str, Any]:
        """
        Direct log injection.  Used ONLY by the chaos engine to produce
        realistic error messages as part of controlled failure scenarios.
        The caller is responsible for supplying the correct level.
        """
        now = datetime.now()
        entry: dict[str, Any] = {
            "id": str(uuid.uuid4())[:8],
            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
            "iso_timestamp": now.isoformat(),
            "level": level.upper(),
            "service": service,
            "container_id": container_id,
            "message": message,
            "metadata": metadata or {"source": "chaos_injection"},
        }
        with self._lock:
            self._buffer.append(entry)
            if level.upper() in ("ERROR", "CRITICAL"):
                self._err_timestamps.append(time.time())
        return entry

    # ── Retrieval ─────────────────────────────────────────

    def get_logs(
        self,
        service: str | None = None,
        level: str | None = None,
        search: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        with self._lock:
            result = list(self._buffer)

        if service and service.lower() not in ("all", ""):
            result = [l for l in result if l["service"].lower() == service.lower()]
        if level and level.upper() not in ("ALL", ""):
            result = [l for l in result if l["level"] == level.upper()]
        if search and search.strip():
            q = search.strip().lower()
            result = [
                l for l in result
                if q in l["message"].lower()
                or q in l["service"].lower()
                or q in l["level"].lower()
            ]
        return list(reversed(result))[:limit]

    def get_error_burst_stats(self) -> dict[str, Any]:
        """Used by the incident detection engine."""
        now = time.time()
        with self._lock:
            buf = list(self._buffer)
            ts_list = list(self._err_timestamps)

        errors_30s = sum(1 for t in ts_list if now - t <= 30)
        errors_5m = sum(1 for t in ts_list if now - t <= 300)
        total = len(buf)
        err_total = sum(1 for e in buf if e["level"] in ("ERROR", "CRITICAL"))
        warn_total = sum(1 for e in buf if e["level"] == "WARN")

        return {
            "total_logs": total,
            "total_errors": err_total,
            "total_warnings": warn_total,
            "errors_last_30s": errors_30s,
            "errors_last_5m": errors_5m,
            "error_rate_percent": round(err_total / max(total, 1) * 100, 1),
            # Legacy keys kept for RCA engine compatibility
            "recent_error_count": errors_5m,
            "recent_warning_count": warn_total,
            "top_patterns": [],
        }

    def get_services(self) -> list[str]:
        """Distinct service names seen in the buffer — used for filter dropdowns."""
        with self._lock:
            return sorted({e["service"] for e in self._buffer if e.get("service")})

    def clear_logs(self) -> None:
        with self._lock:
            self._buffer.clear()
            self._err_timestamps.clear()
            self._seen.clear()
            self._last_collected.clear()


log_engine = LogEngine()
