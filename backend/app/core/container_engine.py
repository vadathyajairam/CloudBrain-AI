"""
container_engine.py  —  Real Docker Integration for Synexis

Connects to Docker Engine via the Docker SDK for Python.
Monitors containers matching allowed sandbox prefixes ('synexis-' and 'cloudbrain-').
Never fabricates container data. If Docker is offline → returns empty list.
"""
from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

from backend.app.config import settings

# ── Docker SDK — optional ─────────────────────────────────────────────────────
DOCKER_AVAILABLE = False
_docker_client = None

try:
    import docker
    import docker.errors

    _candidate = docker.from_env(timeout=4)
    _candidate.ping()
    _docker_client = _candidate
    DOCKER_AVAILABLE = True
except Exception:
    DOCKER_AVAILABLE = False

ALLOWED_PREFIXES = getattr(settings, "ALLOWED_CONTAINER_PREFIXES", ["synexis-"])

# ── Secret key patterns — values matching these will be redacted ──────────────
_SECRET_KEYS = {"PASSWORD", "SECRET", "KEY", "TOKEN", "AUTH", "CREDENTIAL", "PWD"}


def _is_sandbox_name(name: str) -> bool:
    return any(name.startswith(p) for p in ALLOWED_PREFIXES)


# ── Stats helpers ─────────────────────────────────────────────────────────────

def _cpu_percent(stats: dict) -> float:
    try:
        cpu_delta = (
            stats["cpu_stats"]["cpu_usage"]["total_usage"]
            - stats["precpu_stats"]["cpu_usage"]["total_usage"]
        )
        sys_delta = (
            stats["cpu_stats"]["system_cpu_usage"]
            - stats["precpu_stats"]["system_cpu_usage"]
        )
        num_cpus = stats["cpu_stats"].get("online_cpus") or len(
            stats["cpu_stats"]["cpu_usage"].get("percpu_usage", [1])
        )
        if sys_delta > 0 and cpu_delta >= 0:
            return round((cpu_delta / sys_delta) * num_cpus * 100.0, 2)
    except (KeyError, ZeroDivisionError, TypeError):
        pass
    return 0.0


def _memory_mb(stats: dict) -> tuple[float, float]:
    """Returns (used_mb, limit_mb)."""
    try:
        mem = stats.get("memory_stats", {})
        cache = mem.get("stats", {}).get("inactive_file", 0) or mem.get("stats", {}).get("cache", 0)
        used = max(mem.get("usage", 0) - cache, 0)
        limit = mem.get("limit", 0)
        return round(used / 1_048_576, 1), round(limit / 1_048_576, 1)
    except Exception:
        return 0.0, 0.0


def _uptime_str(started_at_iso: str) -> str:
    try:
        ts = started_at_iso[:19]
        started = datetime.fromisoformat(ts).replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - started
        total = int(delta.total_seconds())
        if total < 0:
            return "N/A"
        if total < 60:
            return f"{total}s"
        if total < 3600:
            return f"{total // 60}m {total % 60}s"
        h = total // 3600
        m = (total % 3600) // 60
        return f"{h}h {m}m"
    except Exception:
        return "N/A"


def _redact_env(raw_env: list[str] | None) -> dict[str, str]:
    """Parse Docker env list into dict, redacting sensitive values."""
    result: dict[str, str] = {}
    for entry in (raw_env or []):
        if "=" not in entry:
            continue
        k, v = entry.split("=", 1)
        if any(s in k.upper() for s in _SECRET_KEYS):
            v = "***"
        result[k] = v
    return result


def _container_to_dict(container: Any) -> dict[str, Any]:
    """
    Convert a Docker SDK container object to our standard dict.
    All values come from Docker — nothing is fabricated.
    """
    try:
        stats = container.stats(stream=False)
    except Exception:
        stats = {}

    cpu_pct = _cpu_percent(stats)
    mem_mb, mem_limit_mb = _memory_mb(stats)

    attrs = container.attrs or {}
    state_obj = attrs.get("State", {})
    host_cfg = attrs.get("HostConfig", {})
    config = attrs.get("Config", {})

    health_obj = state_obj.get("Health") or {}
    health_status = health_obj.get("Status", "none")

    if health_status == "healthy":
        state = "healthy"
    elif health_status == "unhealthy":
        state = "unhealthy"
    elif health_status == "starting":
        state = "starting"
    elif container.status == "running":
        state = "running"
    elif container.status == "exited":
        state = "exited"
    else:
        state = container.status

    ports: list[str] = []
    for cp, bindings in (host_cfg.get("PortBindings") or {}).items():
        if bindings:
            for b in bindings:
                host_port = b.get("HostPort", "?")
                container_port = cp.split("/")[0]
                ports.append(f"{host_port}:{container_port}")

    if container.image and container.image.tags:
        image = container.image.tags[0]
    elif container.image:
        image = container.image.short_id
    else:
        image = "unknown"

    raw_created = attrs.get("Created", "")
    created_at = raw_created[:19].replace("T", " ") if raw_created else ""
    uptime = _uptime_str(state_obj.get("StartedAt", ""))

    env = _redact_env(config.get("Env"))
    healthcheck_cmd = ""
    hc = config.get("Healthcheck") or {}
    if hc.get("Test"):
        healthcheck_cmd = " ".join(hc["Test"][1:]) if hc["Test"][0] in ("CMD", "CMD-SHELL") else str(hc["Test"])

    return {
        "id": container.short_id,
        "name": container.name,
        "image": image,
        "status": container.status,
        "state": state,
        "cpu_percent": cpu_pct,
        "memory_mb": mem_mb,
        "memory_limit_mb": mem_limit_mb,
        "ports": ports,
        "restart_count": attrs.get("RestartCount", 0),
        "uptime": uptime,
        "created_at": created_at,
        "env": env,
        "healthcheck": healthcheck_cmd or health_status,
    }


class ContainerEngine:
    """Real Docker integration layer for Synexis sandbox containers."""

    def __init__(self) -> None:
        self._client = _docker_client
        self.docker_available = DOCKER_AVAILABLE

    @property
    def is_sandbox_mode(self) -> bool:
        return not self.docker_available

    def _ping(self) -> bool:
        if self._client is None:
            return False
        try:
            self._client.ping()
            self.docker_available = True
            return True
        except Exception:
            self.docker_available = False
            return False

    def docker_info(self) -> dict[str, Any]:
        if not self._ping():
            return {
                "docker_available": False,
                "version": None,
                "containers_running": 0,
                "containers_total": 0,
                "sandbox_running": False,
            }
        try:
            info = self._client.info()
            version_info = self._client.version()
            sandbox = self.list_containers()
            return {
                "docker_available": True,
                "version": version_info.get("Version"),
                "containers_running": info.get("ContainersRunning", 0),
                "containers_total": info.get("Containers", 0),
                "sandbox_running": len(sandbox) > 0,
                "sandbox_container_count": len(sandbox),
            }
        except Exception:
            return {"docker_available": False, "version": None}

    def list_containers(self, all_containers: bool = True) -> list[dict[str, Any]]:
        if not self._ping():
            return []
        try:
            all_c = self._client.containers.list(all=all_containers)
            sandbox = [c for c in all_c if _is_sandbox_name(c.name)]
            result = []
            for c in sandbox:
                try:
                    result.append(_container_to_dict(c))
                except Exception:
                    pass
            return result
        except Exception:
            return []

    def get_container(self, name_or_id: str) -> dict[str, Any] | None:
        if not self._ping():
            return None
        try:
            c = self._client.containers.get(name_or_id)
            if not _is_sandbox_name(c.name):
                return None
            return _container_to_dict(c)
        except Exception:
            return None

    def get_container_logs(self, name_or_id: str, tail: int = 100) -> list[str]:
        if not self._ping():
            return []
        try:
            c = self._client.containers.get(name_or_id)
            raw: bytes = c.logs(tail=tail, timestamps=True)
            return raw.decode("utf-8", errors="replace").splitlines()
        except Exception:
            return []

    def get_container_logs_since(self, name_or_id: str, since: float = 0.0, tail: int = 50) -> list[str]:
        if not self._ping():
            return []
        try:
            c = self._client.containers.get(name_or_id)
            kwargs: dict[str, Any] = {"timestamps": True, "tail": tail}
            if since > 0:
                kwargs["since"] = int(since)
            raw: bytes = c.logs(**kwargs)
            return raw.decode("utf-8", errors="replace").splitlines()
        except Exception:
            return []

    def _get_sandbox_container(self, name_or_id: str):
        if not self._ping():
            raise RuntimeError("Docker Engine is not connected.")
        try:
            c = self._client.containers.get(name_or_id)
        except Exception as exc:
            raise ValueError(f"Container '{name_or_id}' not found: {exc}") from exc
        if not _is_sandbox_name(c.name):
            raise ValueError(
                f"Container '{c.name}' is not an authorized Synexis sandbox container."
            )
        return c

    def restart_container(self, name_or_id: str) -> dict[str, Any]:
        c = self._get_sandbox_container(name_or_id)
        c.restart(timeout=15)
        c.reload()
        return {
            "status": "success",
            "message": f"Container '{c.name}' restarted",
            "container": _container_to_dict(c),
        }

    def stop_container(self, name_or_id: str) -> dict[str, Any]:
        c = self._get_sandbox_container(name_or_id)
        c.stop(timeout=10)
        c.reload()
        return {
            "status": "success",
            "message": f"Container '{c.name}' stopped",
            "container": _container_to_dict(c),
        }

    def start_container(self, name_or_id: str) -> dict[str, Any]:
        c = self._get_sandbox_container(name_or_id)
        c.start()
        c.reload()
        return {
            "status": "success",
            "message": f"Container '{c.name}' started",
            "container": _container_to_dict(c),
        }


container_engine = ContainerEngine()
