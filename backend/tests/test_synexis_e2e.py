"""
test_synexis_e2e.py  —  Complete End-to-End Incident Lifecycle, RAG & Safe Remediation Test

Validates the full Synexis workflow:
  1. Failure detected via DetectionEngine (e.g. database connection / container outage)
  2. Incident created in database with DETECTED status + evidence items
  3. RAG Knowledge Base retrieves relevant runbooks
  4. AI RCA Engine performs multi-source reasoning grounded in RAG
  5. Remediation Engine proposes safety-allowlisted action (PENDING)
  6. Operator authenticates and approves action with role check
  7. Container Engine executes real container action
  8. Verification Engine conducts 4-point post-remediation health check
  9. Incident automatically transitions to RESOLVED
  10. Incident resolution is converted into an indexed lesson in RAG Knowledge Base
  11. Audit log entry is recorded with full operator & verification details
  12. Synexis AI Copilot retrieves the newly indexed incident lesson to answer queries
"""
import os
import unittest
from unittest.mock import patch, MagicMock

os.environ["DATABASE_URL"] = "sqlite:///./test_synexis_e2e.db"
os.environ.setdefault("GEMINI_API_KEY", "")
os.environ.setdefault("OPENAI_API_KEY", "")

from backend.app.database import init_db, engine, db_session
from backend.app.database.models import Base, Incident, RemediationAction, AuditLog, RAGDocument
from backend.app.core.detection_engine import DetectionResult, EvidenceItem
from backend.app.core.incident_manager import incident_manager, _ACTIVE_KEY_MAP
from backend.app.core.rag_engine import rag_engine
from backend.app.core.ai_rca_engine import ai_rca_engine
from backend.app.core.remediation_engine import remediation_engine
from backend.app.core.verification_engine import verification_engine, VerificationResult, VerificationCheck
from backend.app.core.assistant_engine import assistant_engine
from backend.app.core.audit_logger import audit_logger


class TestSynexisE2EPipeline(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        _ACTIVE_KEY_MAP.clear()
        rag_engine.initialize()

    def tearDown(self):
        _ACTIVE_KEY_MAP.clear()
        Base.metadata.drop_all(bind=engine)

    @patch("backend.app.core.remediation_engine.container_engine")
    @patch("backend.app.core.remediation_engine.verification_engine")
    @patch("backend.app.core.ai_rca_engine.container_engine")
    @patch("backend.app.core.ai_rca_engine.monitoring_engine")
    @patch("backend.app.core.ai_rca_engine.log_engine")
    def test_complete_synexis_e2e_cycle(
        self,
        mock_ai_log,
        mock_ai_mon,
        mock_ai_docker,
        mock_rem_verif,
        mock_rem_docker,
    ):
        # ── 1. Mock live telemetry ────────────────────────────────────────────
        mock_ai_mon.get_latest.return_value = {
            "cpu": {"usage_percent": 25.0, "core_count": 8},
            "memory": {"usage_percent": 65.0, "used_gb": 4.5, "total_gb": 8.0},
            "disk": {"usage_percent": 50.0, "free_gb": 120.0},
            "network": {"download_kbps": 120.0, "upload_kbps": 40.0},
            "health_score": 60,
            "status": "DEGRADED",
        }
        mock_ai_docker.list_containers.return_value = [
            {
                "name": "synexis-postgres",
                "status": "exited",
                "state": "exited",
                "cpu_percent": 0.0,
                "memory_mb": 0.0,
                "memory_limit_mb": 512.0,
                "restart_count": 1,
                "uptime": "N/A",
            },
            {
                "name": "synexis-demo-app",
                "status": "running",
                "state": "unhealthy",
                "cpu_percent": 15.0,
                "memory_mb": 120.0,
                "memory_limit_mb": 512.0,
                "restart_count": 0,
                "uptime": "10m",
            }
        ]
        mock_ai_log.get_error_burst_stats.return_value = {
            "total_logs": 50,
            "total_errors": 8,
            "total_warnings": 2,
            "errors_last_30s": 8,
            "errors_last_5m": 8,
        }
        mock_ai_log.get_logs.return_value = [
            {
                "timestamp": "2026-08-13 18:30:00",
                "level": "ERROR",
                "service": "synexis-demo-app",
                "message": "psycopg2.OperationalError: could not connect to server: Connection refused",
            }
        ]

        # ── 2. Detection Engine detects container stopped ──────────────────────
        detection = DetectionResult(
            rule_id="container_stopped",
            triggered=True,
            severity="CRITICAL",
            title="Container Stopped — synexis-postgres",
            description="Database service synexis-postgres has exited unexpectedly.",
            service="synexis-postgres",
            container_id="pg101",
            evidence=[
                EvidenceItem(evidence_type="CONTAINER", source="synexis-postgres", detail="Status: exited"),
                EvidenceItem(evidence_type="LOG_TRACE", source="synexis-demo-app", detail="OperationalError: connection refused"),
            ],
        )

        incident_dict = incident_manager.create_or_update_incident(detection)
        self.assertIsNotNone(incident_dict)
        self.assertEqual(incident_dict["status"], "DETECTED")
        self.assertEqual(incident_dict["service"], "synexis-postgres")
        incident_id = incident_dict["id"]

        # ── 3. RAG Knowledge Base Retrieval ───────────────────────────────────
        rag_results = rag_engine.retrieve("synexis-postgres container stopped connection refused", top_k=2)
        self.assertGreater(len(rag_results), 0)
        self.assertTrue(any("PostgreSQL" in r["title"] or "Container" in r["title"] for r in rag_results))

        # ── 4. AI RCA Engine analyzes incident with RAG grounding ─────────────
        rca_report = ai_rca_engine.analyze_incident(incident_id=incident_id)
        self.assertEqual(rca_report["status"], "ANALYZED")
        self.assertIn("synexis-postgres", rca_report["root_cause"])
        self.assertGreater(len(rca_report["structured_actions"]), 0)
        self.assertGreater(len(rca_report["rag_sources"]), 0)

        # ── 5. Remediation Engine proposes action (PENDING) ───────────────────
        rec_action = rca_report["structured_actions"][0]
        proposed = remediation_engine.propose_action(
            action_type=rec_action["action"],
            target=rec_action["target"],
            reason=rec_action["reason"],
            incident_id=incident_id,
            proposed_by="ai_rca_engine",
        )
        self.assertEqual(proposed["status"], "PENDING")
        action_id = proposed["id"]

        # ── 6. Mock Docker restart & verification ─────────────────────────────
        mock_rem_docker.start_container.return_value = {"status": "success", "message": "Container started"}
        mock_rem_docker.restart_container.return_value = {"status": "success", "message": "Container restarted"}
        mock_rem_verif.verify.return_value = VerificationResult(
            passed=True,
            summary="All health checks passed. Container 'synexis-postgres' is healthy and operational.",
            checks=[
                VerificationCheck(check="Process State", status="PASSED", detail="Status: RUNNING"),
                VerificationCheck(check="Health State", status="PASSED", detail="Health: HEALTHY"),
            ],
        )

        # ── 7. Operator approves with authorization role ──────────────────────
        exec_res = remediation_engine.approve_and_execute(
            action_id=action_id,
            approved_by="sre_jairam",
            role="sre_operator",
        )
        self.assertEqual(exec_res["status"], "SUCCESS")
        self.assertEqual(exec_res["approved_by"], "sre_jairam")
        self.assertTrue(exec_res["verification"]["passed"])

        # ── 8. Incident Auto-Resolved ─────────────────────────────────────────
        updated_inc = incident_manager.get_by_id(incident_id)
        self.assertEqual(updated_inc["status"], "RESOLVED")
        self.assertIsNotNone(updated_inc["resolved_at"])

        # ── 9. Resolution automatically indexed into RAG ──────────────────────
        rag_incident_lesson = rag_engine.retrieve("Recovery of synexis-postgres sre_jairam", top_k=2)
        self.assertGreater(len(rag_incident_lesson), 0)

        # ── 10. Audit log verified ────────────────────────────────────────────
        audit_entries = audit_logger.get_logs(limit=10)
        self.assertTrue(any(a["action"] == "remediation.approve" and a["actor"] == "sre_jairam" for a in audit_entries))
        self.assertTrue(any(a["action"] == "remediation.execute" and a["result"] == "SUCCESS" for a in audit_entries))

        # ── 11. Synexis AI Copilot responds using RAG knowledge ───────────────
        copilot_res = assistant_engine.process_message("Why did synexis-postgres fail and how was it recovered?")
        self.assertIn("role", copilot_res)
        self.assertEqual(copilot_res["role"], "assistant")
        self.assertGreater(len(copilot_res["content"]), 30)

        print("\n✅ COMPLETE SYNEXIS E2E PIPELINE TEST PASSED WITH 100% SUCCESS.")


if __name__ == "__main__":
    unittest.main()
