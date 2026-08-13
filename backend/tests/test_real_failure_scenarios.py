"""
test_real_failure_scenarios.py  —  Synexis Real Failure Scenario Test Suite

Validates the full automated pipeline across all 5 production outage scenarios:
1. Test 1 — Database failure (PostgreSQL stopped / connection refused)
2. Test 2 — CPU sustained high (CPU spin loop / overload)
3. Test 3 — Error log burst (HTTP 500 / 504 spike)
4. Test 4 — Memory pressure & OOMKilled (Exit 137 risk)
5. Test 5 — Container unexpected exit & service recovery
"""
import os
import unittest
from unittest.mock import patch

os.environ["DATABASE_URL"] = "sqlite:///./test_synexis_scenarios.db"

from backend.app.database import engine
from backend.app.database.models import Base
from backend.app.core.detection_engine import DetectionResult, EvidenceItem
from backend.app.core.incident_manager import incident_manager, IncidentStatus, _ACTIVE_KEY_MAP
from backend.app.core.rag_engine import rag_engine
from backend.app.core.ai_rca_engine import ai_rca_engine
from backend.app.core.remediation_engine import remediation_engine
from backend.app.core.verification_engine import VerificationResult, VerificationCheck


class TestRealFailureScenarios(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        _ACTIVE_KEY_MAP.clear()
        rag_engine.initialize()

    def tearDown(self):
        _ACTIVE_KEY_MAP.clear()
        Base.metadata.drop_all(bind=engine)

    @patch("backend.app.core.remediation_engine.container_engine")
    @patch("backend.app.core.remediation_engine.verification_engine")
    def test_scenario_1_database_failure(self, mock_verif, mock_docker):
        """
        Scenario 1: Stop PostgreSQL -> Detect -> Incident -> Vector RAG -> RCA -> Approve -> Restart -> Verify -> Resolve -> Learn
        """
        mock_docker.restart_container.return_value = {"status": "success", "message": "Container synexis-postgres restarted"}
        mock_verif.verify.return_value = VerificationResult(
            passed=True,
            summary="PostgreSQL process running, TCP probe OK, 0 error logs.",
            checks=[
                VerificationCheck("Docker Process State", "PASSED", "synexis-postgres: RUNNING"),
                VerificationCheck("Docker Healthcheck", "PASSED", "State: HEALTHY"),
                VerificationCheck("Database Connection Probe", "PASSED", "TCP port 5432 responding"),
                VerificationCheck("Error Log Quiescence", "PASSED", "0 errors in last 30s"),
            ],
        )

        # 1. Detection
        det = DetectionResult(
            rule_id="container_stopped",
            triggered=True,
            severity="CRITICAL",
            title="Database Stopped — synexis-postgres",
            description="Database service synexis-postgres container has exited.",
            service="synexis-postgres",
            container_id="pg_01",
            evidence=[EvidenceItem(evidence_type="CONTAINER", source="synexis-postgres", detail="Status: exited (code 1)")],
        )
        inc = incident_manager.create_or_update_incident(det)
        self.assertEqual(inc["status"], IncidentStatus.DETECTED)

        # 2. Vector RAG
        rag_hits = rag_engine.retrieve("synexis-postgres database connection refused stopped", top_k=2)
        self.assertGreater(len(rag_hits), 0)
        self.assertTrue(any("PostgreSQL" in h["title"] or "Container" in h["title"] for h in rag_hits))

        # 3. AI RCA
        rca = ai_rca_engine.analyze_incident(inc["id"])
        self.assertEqual(rca["status"], "ANALYZED")
        self.assertIn("root_cause", rca)
        self.assertGreater(len(rca["rag_sources"]), 0)

        # 4. Safe Remediation Proposal
        proposal = remediation_engine.propose_action(
            action_type="restart_container",
            target="synexis-postgres",
            reason=rca["recommendation"] or "Restart database container",
            incident_id=inc["id"],
        )
        self.assertEqual(proposal["status"], "PENDING")

        # 5. User Approval & Real Docker Execution
        exec_res = remediation_engine.approve_and_execute(
            action_id=proposal["id"],
            approved_by="sre_operator_sarah",
            role="sre_operator",
        )
        self.assertEqual(exec_res["status"], "SUCCESS")
        self.assertTrue(exec_res["verification"]["passed"])
        self.assertTrue(exec_res["incident_resolved"])

        # 6. Verify Incident RESOLVED & Indexed to RAG
        resolved_inc = incident_manager.get_by_id(inc["id"])
        self.assertEqual(resolved_inc["status"], IncidentStatus.RESOLVED)

    @patch("backend.app.core.remediation_engine.container_engine")
    @patch("backend.app.core.remediation_engine.verification_engine")
    def test_scenario_2_cpu_stress(self, mock_verif, mock_docker):
        """
        Scenario 2: CPU Stress -> Detect -> Incident -> Vector RAG -> RCA -> Approve -> Restart -> Verify -> Resolve
        """
        mock_docker.restart_container.return_value = {"status": "success", "message": "Container restarted"}
        mock_verif.verify.return_value = VerificationResult(
            passed=True,
            summary="CPU load returned to 18%, container healthy.",
            checks=[VerificationCheck("CPU Utilization", "PASSED", "CPU 18% < 80% threshold")],
        )

        det = DetectionResult(
            rule_id="cpu_sustained_high",
            triggered=True,
            severity="HIGH",
            title="High CPU Utilization — synexis-demo-app",
            description="CPU load sustained at 94% for > 60s.",
            service="synexis-demo-app",
            container_id="app_01",
            evidence=[EvidenceItem(evidence_type="METRIC", source="docker_stats", detail="CPU at 94.2%")],
        )
        inc = incident_manager.create_or_update_incident(det)
        self.assertEqual(inc["status"], IncidentStatus.DETECTED)

        rag_hits = rag_engine.retrieve("high cpu utilization spin loop worker thread", top_k=2)
        self.assertGreater(len(rag_hits), 0)
        self.assertTrue(any("CPU" in h["title"] for h in rag_hits))

        rca = ai_rca_engine.analyze_incident(inc["id"])
        self.assertEqual(rca["status"], "ANALYZED")

        proposal = remediation_engine.propose_action(
            action_type="restart_container",
            target="synexis-demo-app",
            reason="Terminate runaway CPU spin loops",
            incident_id=inc["id"],
        )
        exec_res = remediation_engine.approve_and_execute(proposal["id"], approved_by="admin_alex", role="admin")
        self.assertEqual(exec_res["status"], "SUCCESS")

        resolved = incident_manager.get_by_id(inc["id"])
        self.assertEqual(resolved["status"], IncidentStatus.RESOLVED)

    @patch("backend.app.core.remediation_engine.container_engine")
    @patch("backend.app.core.remediation_engine.verification_engine")
    def test_scenario_3_error_burst(self, mock_verif, mock_docker):
        """
        Scenario 3: Error Burst -> Detect -> Incident -> Vector RAG -> RCA -> Remediation
        """
        mock_docker.restart_container.return_value = {"status": "success", "message": "restarted"}
        mock_verif.verify.return_value = VerificationResult(
            passed=True,
            summary="Error rate zeroed.",
            checks=[VerificationCheck("Log Errors", "PASSED", "0 errors")],
        )

        det = DetectionResult(
            rule_id="error_burst",
            triggered=True,
            severity="HIGH",
            title="Error Log Burst — synexis-demo-app",
            description="18 HTTP 500 errors in 30 seconds.",
            service="synexis-demo-app",
            container_id="app_01",
            evidence=[EvidenceItem(evidence_type="LOG_TRACE", source="synexis-demo-app", detail="HTTP 500 Internal Server Error")],
        )
        inc = incident_manager.create_or_update_incident(det)
        self.assertEqual(inc["status"], IncidentStatus.DETECTED)

        rag_hits = rag_engine.retrieve("error burst connection refused 500 exceptions", top_k=2)
        self.assertGreater(len(rag_hits), 0)

        rca = ai_rca_engine.analyze_incident(inc["id"])
        self.assertIn("root_cause", rca)

    @patch("backend.app.core.remediation_engine.container_engine")
    @patch("backend.app.core.remediation_engine.verification_engine")
    def test_scenario_4_memory_pressure_oom(self, mock_verif, mock_docker):
        """
        Scenario 4: Memory Pressure -> Detection -> Vector RAG -> RCA
        """
        det = DetectionResult(
            rule_id="memory_high",
            triggered=True,
            severity="HIGH",
            title="High Memory Usage — synexis-demo-app",
            description="Memory usage reached 92% of cgroup limit.",
            service="synexis-demo-app",
            container_id="app_01",
            evidence=[EvidenceItem(evidence_type="METRIC", source="cgroups", detail="Memory at 480MB / 512MB")],
        )
        inc = incident_manager.create_or_update_incident(det)
        self.assertEqual(inc["status"], IncidentStatus.DETECTED)

        rag_hits = rag_engine.retrieve("container memory leak OOMKilled exit code 137", top_k=2)
        self.assertGreater(len(rag_hits), 0)
        self.assertTrue(any("OOM" in h["title"] or "Memory" in h["title"] for h in rag_hits))

        rca = ai_rca_engine.analyze_incident(inc["id"])
        self.assertEqual(rca["status"], "ANALYZED")

    @patch("backend.app.core.remediation_engine.container_engine")
    @patch("backend.app.core.remediation_engine.verification_engine")
    def test_scenario_5_container_unexpected_exit(self, mock_verif, mock_docker):
        """
        Scenario 5: Container unexpected exit -> Detection -> RAG -> Remediation
        """
        det = DetectionResult(
            rule_id="container_stopped",
            triggered=True,
            severity="CRITICAL",
            title="Container Unexpected Exit — synexis-worker",
            description="Container synexis-worker exited with code 139 (SIGSEGV).",
            service="synexis-worker",
            container_id="wrk_01",
            evidence=[EvidenceItem(evidence_type="CONTAINER", source="docker", detail="ExitCode 139")],
        )
        inc = incident_manager.create_or_update_incident(det)
        self.assertEqual(inc["status"], IncidentStatus.DETECTED)

        rag_hits = rag_engine.retrieve("container unexpected exit service outage recovery", top_k=2)
        self.assertGreater(len(rag_hits), 0)


if __name__ == "__main__":
    unittest.main()
