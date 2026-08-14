import os
import time
import pytest
from unittest.mock import patch, MagicMock

os.environ["DATABASE_URL"] = "sqlite:///./test_synexis_int.db"
os.environ.setdefault("GEMINI_API_KEY", "")
os.environ.setdefault("OPENAI_API_KEY", "")

from backend.app.database import init_db, engine
from backend.app.database.models import Base
from backend.app.core.incident_manager import IncidentManager, IncidentStatus, _ACTIVE_KEY_MAP
from backend.app.core.detection_engine import DetectionEngine, DetectionResult, EvidenceItem
from backend.app.core.ai_rca_engine import AIRCAEngine
from backend.app.core.remediation_engine import RemediationEngine
from backend.app.core.verification_engine import VerificationEngine, VerificationResult, VerificationCheck


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    _ACTIVE_KEY_MAP.clear()
    yield
    _ACTIVE_KEY_MAP.clear()
    Base.metadata.drop_all(bind=engine)


class TestFullChaosToResolvePipeline:
    """
    Simulates the full pipeline:
    1. Detection engine fires container_stopped rule for synexis-postgres
    2. Incident created in DB with DETECTED status
    3. RCA engine analyzes the incident
    4. Remediation proposed (start_container)
    5. User approves
    6. Container starts successfully
    7. Verification passes
    8. Incident auto-resolved to RESOLVED
    """

    @patch("backend.app.core.remediation_engine.verification_engine")
    @patch("backend.app.core.remediation_engine.container_engine")
    @patch("backend.app.core.ai_rca_engine.monitoring_engine")
    @patch("backend.app.core.ai_rca_engine.container_engine")
    @patch("backend.app.core.ai_rca_engine.log_engine")
    def test_full_pipeline(
        self,
        mock_log_engine,
        mock_ai_container_engine,
        mock_ai_monitoring,
        mock_rem_docker,
        mock_verifier,
    ):
        # ── 1. Mock telemetry ──────────────────────────────────────────────
        mock_ai_monitoring.get_latest.return_value = {
            "cpu": {"usage_percent": 15.0},
            "memory": {"usage_percent": 60.0, "used_gb": 4.0, "total_gb": 8.0},
            "disk": {"usage_percent": 55.0},
            "health_score": 75,
            "status": "DEGRADED",
        }
        mock_ai_container_engine.list_containers.return_value = [
            {
                "name": "synexis-postgres",
                "status": "exited",
                "state": "exited",
                "cpu_percent": 0.0,
                "memory_mb": 0.0,
                "memory_limit_mb": 512.0,
                "restart_count": 0,
                "uptime": "N/A",
            }
        ]
        mock_log_engine.get_error_burst_stats.return_value = {
            "total_logs": 20, "total_errors": 3,
            "total_warnings": 1, "errors_last_30s": 3, "errors_last_5m": 3,
        }
        mock_log_engine.get_logs.return_value = [
            {"timestamp": "2026-01-01 00:00:00", "level": "ERROR",
             "service": "synexis-demo-app", "message": "connection refused to postgres"}
        ]

        # ── 2. Detection engine fires ──────────────────────────────────────
        detection_result = DetectionResult(
            rule_id="container_stopped",
            triggered=True,
            severity="CRITICAL",
            title="Container Stopped — synexis-postgres",
            description="Container 'synexis-postgres' is stopped.",
            service="synexis-postgres",
            container_id="pg001",
            evidence=[
                EvidenceItem(
                    evidence_type="CONTAINER",
                    source="synexis-postgres",
                    detail="Container status: exited"
                )
            ],
        )

        # ── 3. Create incident ─────────────────────────────────────────────
        mgr = IncidentManager()
        incident = mgr.create_or_update_incident(detection_result)
        assert incident is not None
        assert incident["status"] == IncidentStatus.DETECTED
        assert incident["severity"] == "CRITICAL"
        incident_id = incident["id"]

        # ── 4. Acknowledge ─────────────────────────────────────────────────
        mgr.acknowledge(incident_id)
        mgr.set_investigating(incident_id)
        updated = mgr.get_by_id(incident_id)
        assert updated["status"] == IncidentStatus.INVESTIGATING

        # ── 5. AI RCA ──────────────────────────────────────────────────────
        # No AI key → rules-only fallback
        rca_engine = AIRCAEngine()
        analysis = rca_engine.analyze_incident(incident_id=incident_id)
        assert analysis["status"] == "ANALYZED"
        assert "root_cause" in analysis
        # Confidence should be None (no AI key), not a hard-coded number
        # Rules-only returns None confidence
        assert analysis["model_used"].startswith("rules-only")

        # ── 6. Propose remediation ────────────────────────────────────────
        rem_engine = RemediationEngine()
        proposal = rem_engine.propose_action(
            action_type="start_container",
            target="synexis-postgres",
            reason="Container stopped — starting it",
            incident_id=incident_id,
            proposed_by="user",
        )
        assert proposal["status"] == "PENDING"

        # ── 7. User approves + execute ────────────────────────────────────
        mock_rem_docker.start_container.return_value = {
            "status": "success",
            "message": "Container 'synexis-postgres' started",
        }
        mock_verifier.verify.return_value = VerificationResult(
            passed=True,
            summary="All 5 checks passed. Container 'synexis-postgres' is healthy.",
            checks=[
                VerificationCheck("Container Process State", "PASSED", "Status: RUNNING"),
                VerificationCheck("Docker Health Check",    "PASSED", "State: HEALTHY"),
                VerificationCheck("Application /health Endpoint", "SKIPPED", "No endpoint"),
                VerificationCheck("Error Rate",             "PASSED", "0 errors in 30s"),
                VerificationCheck("Resource Utilisation",   "PASSED", "CPU: 1.2%, Memory: 120MB"),
            ],
        )

        execution = rem_engine.approve_and_execute(proposal["id"], approved_by="user")

        # ── 8. Verify execution succeeded ─────────────────────────────────
        assert execution["status"] == "SUCCESS"
        assert execution["verification"]["passed"] is True
        assert execution["incident_resolved"] is True

        # ── 9. Confirm incident is RESOLVED in DB ─────────────────────────
        final = mgr.get_by_id(incident_id)
        assert final["status"] == IncidentStatus.RESOLVED
        assert final["resolved_at"] is not None

        print("\n✅ Full pipeline test passed:")
        print(f"  Incident: {incident_id}")
        print(f"  RCA model: {analysis['model_used']}")
        print(f"  RCA confidence: {analysis['confidence']}")
        print(f"  Action: {execution['action_type']} → {execution['status']}")
        print(f"  Verification: {execution['verification']['summary']}")
        print(f"  Final status: {final['status']}")
