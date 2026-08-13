"""
test_detection_engine.py  —  Unit tests for the Detection Engine

Uses mock telemetry data — does not require Docker or live system.
"""
import pytest
from unittest.mock import patch, MagicMock

from backend.app.core.detection_engine import DetectionEngine


def _make_metrics(cpu=10.0, memory=50.0, disk=60.0):
    return {
        "cpu": {"usage_percent": cpu, "cores_usage": [cpu]},
        "memory": {"usage_percent": memory, "used_gb": 4.0, "total_gb": 8.0, "swap_percent": 0},
        "disk": {"usage_percent": disk, "used_gb": 100.0, "free_gb": 40.0, "total_gb": 140.0},
        "health_score": 90,
        "status": "HEALTHY",
    }


def _make_container(name="cloudbrain-test", status="running", state="healthy", restart=0, cpu=5.0, mem=100.0):
    return {
        "id": "abc123",
        "name": name,
        "status": status,
        "state": state,
        "cpu_percent": cpu,
        "memory_mb": mem,
        "memory_limit_mb": 512.0,
        "restart_count": restart,
    }


class TestCPUSustainedHigh:
    def test_not_triggered_when_cpu_normal(self):
        engine = DetectionEngine()
        result = engine._rule_cpu_sustained_high(_make_metrics(cpu=30.0))
        assert not result.triggered

    def test_triggered_after_sustained_period(self):
        import time
        engine = DetectionEngine()
        engine._cpu_high_since = time.time() - 120  # 120s above threshold
        result = engine._rule_cpu_sustained_high(_make_metrics(cpu=95.0))
        assert result.triggered
        assert result.rule_id == "cpu_sustained_high"
        assert result.severity == "HIGH"
        assert len(result.evidence) > 0

    def test_resets_when_cpu_drops(self):
        import time
        engine = DetectionEngine()
        engine._cpu_high_since = time.time() - 120
        # CPU back to normal
        result = engine._rule_cpu_sustained_high(_make_metrics(cpu=20.0))
        assert not result.triggered
        assert engine._cpu_high_since is None


class TestMemoryHigh:
    def test_not_triggered_below_threshold(self):
        engine = DetectionEngine()
        result = engine._rule_memory_high(_make_metrics(memory=80.0))
        assert not result.triggered

    def test_triggered_above_threshold(self):
        engine = DetectionEngine()
        result = engine._rule_memory_high(_make_metrics(memory=95.0))
        assert result.triggered
        assert result.rule_id == "memory_high"
        assert len(result.evidence) > 0


class TestDiskHigh:
    def test_not_triggered_below_threshold(self):
        engine = DetectionEngine()
        result = engine._rule_disk_high(_make_metrics(disk=80.0))
        assert not result.triggered

    def test_triggered_above_threshold(self):
        engine = DetectionEngine()
        result = engine._rule_disk_high(_make_metrics(disk=95.0))
        assert result.triggered
        assert result.rule_id == "disk_high"


class TestContainerStopped:
    def test_not_triggered_when_running(self):
        engine = DetectionEngine()
        c = _make_container(status="running")
        result = engine._rule_container_stopped(c)
        assert not result.triggered

    def test_triggered_when_exited(self):
        engine = DetectionEngine()
        c = _make_container(status="exited")
        result = engine._rule_container_stopped(c)
        assert result.triggered
        assert result.rule_id == "container_stopped"
        assert result.severity == "CRITICAL"

    def test_triggered_when_dead(self):
        engine = DetectionEngine()
        c = _make_container(status="dead")
        result = engine._rule_container_stopped(c)
        assert result.triggered


class TestContainerUnhealthy:
    def test_not_triggered_when_healthy(self):
        engine = DetectionEngine()
        result = engine._rule_container_unhealthy(_make_container(state="healthy"))
        assert not result.triggered

    def test_triggered_when_unhealthy(self):
        engine = DetectionEngine()
        result = engine._rule_container_unhealthy(_make_container(state="unhealthy"))
        assert result.triggered
        assert result.rule_id == "container_unhealthy"


class TestRestartLoop:
    def test_not_triggered_with_zero_restarts(self):
        engine = DetectionEngine()
        result = engine._rule_container_restart_loop(_make_container(restart=0))
        assert not result.triggered

    def test_not_triggered_below_threshold(self):
        engine = DetectionEngine()
        # restart_count=2 is below threshold of 3
        result = engine._rule_container_restart_loop(_make_container(restart=2))
        assert not result.triggered

    def test_triggered_with_increasing_restarts(self):
        engine = DetectionEngine()
        c = _make_container(restart=3)
        # First call sets prev=3, triggered=True (3>=3 and 3>0 prev)
        result = engine._rule_container_restart_loop(c)
        assert result.triggered

    def test_not_triggered_when_restart_count_stable(self):
        engine = DetectionEngine()
        c = _make_container(restart=3)
        engine._prev_restart_counts["abc123"] = 3  # same as current
        result = engine._rule_container_restart_loop(c)
        # count didn't increase
        assert not result.triggered


class TestErrorBurst:
    def test_not_triggered_below_threshold(self):
        engine = DetectionEngine()
        stats = {"errors_last_30s": 2, "total_errors": 2, "total_logs": 100}
        result = engine._rule_error_log_burst(stats)
        assert not result.triggered

    def test_triggered_above_threshold(self):
        engine = DetectionEngine()
        stats = {"errors_last_30s": 10, "total_errors": 10, "total_logs": 50}
        result = engine._rule_error_log_burst(stats)
        assert result.triggered
        assert result.rule_id == "error_log_burst"
