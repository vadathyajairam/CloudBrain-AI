import os
import pytest

# Force SQLite in-memory DB for tests (must be set before any app imports)
os.environ["DATABASE_URL"] = "sqlite:///./test_cloudbrain.db"

from backend.app.database import init_db, engine
from backend.app.database.models import Base
from backend.app.core.detection_engine import DetectionResult, EvidenceItem
from backend.app.core.incident_manager import IncidentManager, IncidentStatus, _ACTIVE_KEY_MAP


@pytest.fixture(autouse=True)
def setup_db():
    """Drop and recreate all tables before each test for clean isolation."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    _ACTIVE_KEY_MAP.clear()
    yield
    _ACTIVE_KEY_MAP.clear()
    Base.metadata.drop_all(bind=engine)


def _make_result(
    rule_id="cpu_sustained_high",
    service="local-machine",
    severity="HIGH",
    triggered=True,
):
    return DetectionResult(
        rule_id=rule_id,
        triggered=triggered,
        severity=severity,
        title=f"Test Incident — {rule_id}",
        description="Test description",
        service=service,
        container_id="",
        evidence=[
            EvidenceItem(evidence_type="METRIC", source="psutil", detail="CPU at 95%")
        ],
    )


class TestCreateIncident:
    def test_creates_incident_in_db(self):
        mgr = IncidentManager()
        result = _make_result()
        inc = mgr.create_or_update_incident(result)
        assert inc is not None
        assert inc["title"] == "Test Incident — cpu_sustained_high"
        assert inc["status"] == IncidentStatus.DETECTED
        assert inc["severity"] == "HIGH"

    def test_returns_none_for_non_triggered(self):
        mgr = IncidentManager()
        result = _make_result(triggered=False)
        inc = mgr.create_or_update_incident(result)
        assert inc is None

    def test_deduplicates_same_rule_service(self):
        mgr = IncidentManager()
        result = _make_result()
        inc1 = mgr.create_or_update_incident(result)
        inc2 = mgr.create_or_update_incident(result)
        assert inc1["id"] == inc2["id"]  # Same incident, not a new one

    def test_creates_new_incident_for_different_service(self):
        mgr = IncidentManager()
        inc1 = mgr.create_or_update_incident(_make_result(service="svc-a"))
        inc2 = mgr.create_or_update_incident(_make_result(service="svc-b"))
        assert inc1["id"] != inc2["id"]


class TestLifecycleTransitions:
    def test_acknowledge(self):
        mgr = IncidentManager()
        inc = mgr.create_or_update_incident(_make_result())
        updated = mgr.acknowledge(inc["id"])
        assert updated["status"] == IncidentStatus.ACKNOWLEDGED

    def test_set_investigating(self):
        mgr = IncidentManager()
        inc = mgr.create_or_update_incident(_make_result())
        mgr.acknowledge(inc["id"])
        updated = mgr.set_investigating(inc["id"])
        assert updated["status"] == IncidentStatus.INVESTIGATING

    def test_resolve(self):
        mgr = IncidentManager()
        inc = mgr.create_or_update_incident(_make_result())
        resolved = mgr.resolve(inc["id"])
        assert resolved["status"] == IncidentStatus.RESOLVED
        assert resolved["resolved_at"] is not None

    def test_resolve_removes_from_dedup_map(self):
        mgr = IncidentManager()
        result = _make_result()
        inc = mgr.create_or_update_incident(result)
        mgr.resolve(inc["id"])
        # Now creating a new incident for the same rule+service should produce a new ID
        inc2 = mgr.create_or_update_incident(result)
        assert inc2 is not None
        assert inc2["id"] != inc["id"]


class TestAutoResolve:
    def test_auto_resolve_when_rule_clears(self):
        mgr = IncidentManager()
        result = _make_result(rule_id="memory_high", service="local-machine")
        inc = mgr.create_or_update_incident(result)
        resolved = mgr.auto_resolve_if_clear("memory_high", "local-machine")
        assert resolved is True
        updated = mgr.get_by_id(inc["id"])
        assert updated["status"] == IncidentStatus.RESOLVED

    def test_auto_resolve_returns_false_when_no_incident(self):
        mgr = IncidentManager()
        result = mgr.auto_resolve_if_clear("nonexistent_rule", "no-service")
        assert result is False


class TestQueries:
    def test_get_active_returns_only_active(self):
        mgr = IncidentManager()
        mgr.create_or_update_incident(_make_result(rule_id="r1", service="s1"))
        inc2 = mgr.create_or_update_incident(_make_result(rule_id="r2", service="s2"))
        mgr.resolve(inc2["id"])
        active = mgr.get_active()
        assert len(active) == 1
        assert active[0]["status"] == IncidentStatus.DETECTED

    def test_get_stats(self):
        mgr = IncidentManager()
        mgr.create_or_update_incident(_make_result(rule_id="r1", service="s1", severity="CRITICAL"))
        stats = mgr.get_stats()
        assert stats["active"] >= 1
        assert stats["critical_active"] >= 1
