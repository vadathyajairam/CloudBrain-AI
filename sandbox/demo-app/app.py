#!/usr/bin/env python3
"""
Synexis Sandbox Demo Application
================================
A realistic Flask service that generates genuine log output and exposes
controlled chaos endpoints for the Synexis chaos sandbox.

Endpoints:
  GET  /health               — liveness probe
  GET  /api/users            — simulated user-service API
  GET  /api/orders           — simulated order-service API
  GET  /api/metrics          — basic app counters
  POST /chaos/cpu            — start CPU stress (background threads)
  POST /chaos/errors         — inject DB error responses + log bursts
  POST /chaos/memory         — allocate large byte arrays (memory pressure)
  POST /chaos/slow           — add artificial latency to all responses
  POST /chaos/reset          — clear all active chaos scenarios
  GET  /chaos/status         — current chaos state
"""

from __future__ import annotations

import os
import random
import threading
import time
from datetime import datetime, timezone

from flask import Flask, jsonify, request

# ── Logging: structured output that Docker picks up via stdout ─────────────────
import logging

logging.basicConfig(
    level=logging.DEBUG if os.getenv("APP_ENV") == "development" else logging.INFO,
    format="%(asctime)s %(levelname)-8s [demo-app] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("demo-app")

app = Flask(__name__)
_start_time = time.time()

# ── Chaos state (shared across threads) ───────────────────────────────────────
_chaos_lock = threading.Lock()
_chaos: dict[str, bool] = {
    "cpu_stress": False,
    "error_injection": False,
    "memory_pressure": False,
    "slow_responses": False,
}
_leaked_memory: list[bytearray] = []
_request_counters = {"total": 0, "errors": 0}

# ── Helper ─────────────────────────────────────────────────────────────────────

def _is_chaos(key: str) -> bool:
    with _chaos_lock:
        return _chaos.get(key, False)


def _set_chaos(key: str, value: bool) -> None:
    with _chaos_lock:
        _chaos[key] = value


def _uptime() -> str:
    secs = int(time.time() - _start_time)
    h, rem = divmod(secs, 3600)
    m, s = divmod(rem, 60)
    return f"{h}h {m}m {s}s" if h else f"{m}m {s}s"


# ── Health & metrics ───────────────────────────────────────────────────────────

@app.route("/health")
def health():
    with _chaos_lock:
        active = [k for k, v in _chaos.items() if v]
    status = "degraded" if active else "healthy"
    return jsonify({
        "status": status,
        "service": "synexis-demo-app",
        "uptime": _uptime(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "active_chaos": active,
    }), (200 if status == "healthy" else 200)


@app.route("/api/metrics")
def app_metrics():
    logger.info("GET /api/metrics 200 2ms")
    return jsonify({
        "requests_total": _request_counters["total"],
        "errors_total": _request_counters["errors"],
        "uptime_seconds": int(time.time() - _start_time),
        "environment": os.getenv("APP_ENV", "sandbox"),
    })


# ── Simulated application API ─────────────────────────────────────────────────

@app.route("/api/users")
def get_users():
    _request_counters["total"] += 1

    if _is_chaos("slow_responses"):
        delay = random.uniform(2.0, 4.5)
        logger.warning(f"High latency detected: /api/users response delayed by {delay:.1f}s")
        time.sleep(delay)

    if _is_chaos("error_injection"):
        _request_counters["errors"] += 1
        logger.error("psycopg2.OperationalError: could not connect to server: Connection refused")
        logger.error("Is the server running on host \"synexis-postgres\" and accepting TCP/IP connections on port 5432?")
        return jsonify({"error": "Database connection failed"}), 503

    ms = random.randint(8, 55)
    logger.info(f"GET /api/users 200 {ms}ms")
    return jsonify({
        "users": [
            {"id": 1, "name": "Alice Johnson", "email": "alice@example.com", "role": "admin"},
            {"id": 2, "name": "Bob Smith", "email": "bob@example.com", "role": "user"},
            {"id": 3, "name": "Carol Williams", "email": "carol@example.com", "role": "user"},
        ],
        "total": 3,
    })


@app.route("/api/orders")
def get_orders():
    _request_counters["total"] += 1

    if _is_chaos("slow_responses"):
        delay = random.uniform(3.0, 6.0)
        logger.warning(f"Slow query detected: SELECT orders WHERE status=? took {int(delay * 1000)}ms — threshold is 500ms")
        time.sleep(delay)

    if _is_chaos("error_injection"):
        _request_counters["errors"] += 1
        logger.error("FATAL: remaining connection slots are reserved for non-replication superuser connections")
        logger.error("psycopg2.OperationalError: FATAL: connection pool exhausted (50/50 connections in use)")
        return jsonify({"error": "Service unavailable — connection pool exhausted"}), 500

    ms = random.randint(15, 95)
    logger.info(f"GET /api/orders 200 {ms}ms")
    return jsonify({
        "orders": [
            {"id": "ORD-001", "user_id": 1, "status": "delivered", "total": 49.99},
            {"id": "ORD-002", "user_id": 2, "status": "processing", "total": 129.00},
        ],
        "total": 2,
    })


@app.route("/api/auth/verify", methods=["POST"])
def auth_verify():
    _request_counters["total"] += 1
    ms = random.randint(5, 20)
    logger.info(f"POST /api/auth/verify 200 {ms}ms")
    return jsonify({"valid": True, "expires_in": 3600})


# ── Chaos endpoints ───────────────────────────────────────────────────────────

@app.route("/chaos/cpu", methods=["POST"])
def chaos_cpu():
    _set_chaos("cpu_stress", True)

    def _burn() -> None:
        while _is_chaos("cpu_stress"):
            # Compute-intensive loop — will saturate one core
            _ = sum(i * i for i in range(100_000))

    for _ in range(2):
        threading.Thread(target=_burn, daemon=True).start()

    logger.warning("CHAOS INJECTED: CPU stress — 2 worker threads spinning at 100%")
    logger.error("Backend API retry attempt 1/5 — upstream timeout on /api/db")
    logger.error("Thread pool saturation: 45/50 worker threads blocked on socket read")
    return jsonify({"status": "cpu_stress_started", "threads": 2})


@app.route("/chaos/errors", methods=["POST"])
def chaos_errors():
    _set_chaos("error_injection", True)

    for _ in range(6):
        logger.error("HTTP 503 Service Unavailable — upstream database server not responding")
        logger.error("psycopg2.OperationalError: SSL connection has been closed unexpectedly")

    logger.warning("CHAOS INJECTED: All API responses will return 5xx errors")
    return jsonify({"status": "error_injection_started"})


@app.route("/chaos/memory", methods=["POST"])
def chaos_memory():
    _set_chaos("memory_pressure", True)
    chunk_mb = 75
    chunk = bytearray(chunk_mb * 1024 * 1024)
    _leaked_memory.append(chunk)
    total_mb = len(_leaked_memory) * chunk_mb

    logger.warning(f"Memory utilization exceeded 80% threshold ({total_mb}MB allocated — chunk #{len(_leaked_memory)})")
    if total_mb >= 300:
        logger.critical(f"Kernel OOM-killer invoked: Killed process (worker) total-vm:{total_mb}MB")
        logger.error(f"Container exited with status code 137 (SIGKILL OOM)")
    return jsonify({"status": "memory_allocated", "leaked_mb": total_mb, "chunks": len(_leaked_memory)})


@app.route("/chaos/slow", methods=["POST"])
def chaos_slow():
    _set_chaos("slow_responses", True)
    logger.warning("CHAOS INJECTED: Artificial latency added — all responses delayed 2-5s")
    return jsonify({"status": "slow_responses_started"})


@app.route("/chaos/reset", methods=["POST"])
def chaos_reset():
    with _chaos_lock:
        for key in _chaos:
            _chaos[key] = False
    _leaked_memory.clear()
    logger.info("CHAOS RESET: All scenarios cleared. System returning to normal operation.")
    logger.info("Connection pool restored: 5/50 active connections")
    logger.info("Worker threads unblocked. Latency normalizing.")
    return jsonify({"status": "reset", "message": "All chaos scenarios cleared"})


@app.route("/chaos/status")
def chaos_status():
    with _chaos_lock:
        state = dict(_chaos)
    return jsonify({
        "any_active": any(state.values()),
        "scenarios": state,
        "leaked_memory_mb": len(_leaked_memory) * 75,
    })


# ── Background traffic simulator ──────────────────────────────────────────────

_TRAFFIC_ROUTES = [
    ("/api/users",       "GET",  200, 8,  45),
    ("/api/orders",      "GET",  200, 15, 90),
    ("/api/metrics",     "GET",  200, 2,  8),
    ("/api/users/1",     "GET",  200, 5,  25),
    ("/api/auth/verify", "POST", 200, 6,  18),
]


def _traffic_simulator() -> None:
    """
    Generates realistic request log lines to stdout at a natural pace.
    Synexis log engine picks these up via Docker's log API.
    """
    logger.info("Background traffic simulator started")
    while True:
        try:
            time.sleep(random.uniform(1.5, 5.0))

            if _is_chaos("error_injection"):
                logger.error("HTTP 504 Gateway Timeout — upstream /api/db did not respond within 30s")
                logger.error("Retry attempt 3/5 with 0ms backoff — no circuit breaker configured")
                continue

            route, method, status, min_ms, max_ms = random.choice(_TRAFFIC_ROUTES)
            ms = random.randint(min_ms, max_ms)

            roll = random.random()
            if roll < 0.03:
                logger.error(f"Unhandled exception in route handler for {route}: NullPointerException")
            elif roll < 0.08:
                logger.warning(f"Slow query on {route}: database took {ms + random.randint(200, 800)}ms")
            else:
                logger.info(f"{method} {route} {status} {ms}ms")

        except Exception as exc:
            logger.error(f"Traffic simulator error: {exc}")
            time.sleep(5)


if __name__ == "__main__":
    # Start background traffic simulator
    threading.Thread(target=_traffic_simulator, daemon=True).start()

    logger.info("=" * 60)
    logger.info("Synexis Demo App v1.0 starting")
    logger.info(f"Environment: {os.getenv('APP_ENV', 'sandbox')}")
    logger.info(f"Database: {os.getenv('DATABASE_URL', 'synexis-postgres:5432')}")
    logger.info(f"Redis:    {os.getenv('REDIS_URL', 'synexis-redis:6379')}")
    logger.info("=" * 60)

    app.run(host="0.0.0.0", port=5000, threaded=True)
