import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.monitoring import monitoring_engine
from backend.app.core.container_engine import container_engine
from backend.app.core.chaos_engine import chaos_engine
from backend.app.core.ai_rca_engine import ai_rca_engine
from backend.app.core.config_analyzer import config_analyzer, SAMPLE_CONFIGS
from backend.app.core.remediation_engine import remediation_engine

class TestCloudBrainBackend(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("health_score", data)

    def test_metrics_collection(self):
        snapshot = monitoring_engine.collect_snapshot()
        self.assertIn("cpu", snapshot)
        self.assertIn("memory", snapshot)
        self.assertIn("disk", snapshot)
        self.assertIn("network", snapshot)
        self.assertGreaterEqual(snapshot["health_score"], 0)

        res = self.client.get("/api/v1/metrics/live")
        self.assertEqual(res.status_code, 200)

    def test_container_engine(self):
        containers = container_engine.list_containers()
        self.assertGreaterEqual(len(containers), 4)
        
        # Test restart
        res = container_engine.restart_container("c-backend")
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["container"]["status"], "running")

    def test_config_analyzer_docker_compose(self):
        vulnerable_compose = SAMPLE_CONFIGS["docker_compose_vulnerable"]
        audit = config_analyzer.audit_config("docker-compose", vulnerable_compose)
        self.assertIn("score", audit)
        self.assertIn("issues", audit)
        # Must detect port collision and privileged container
        titles = [i["title"] for i in audit["issues"]]
        self.assertTrue(any("Port Collision" in t for t in titles))
        self.assertTrue(any("Privileged Mode" in t for t in titles))

    def test_chaos_and_rca_cycle(self):
        # 1. Trigger CPU retry storm
        trigger_res = chaos_engine.trigger_scenario("retry_storm")
        self.assertEqual(trigger_res["status"], "triggered")

        # 2. RCA must identify retry storm
        rca = ai_rca_engine.analyze_incident()
        self.assertEqual(rca["severity"], "CRITICAL")
        self.assertIn("Retry", rca["title"])
        self.assertGreaterEqual(rca["confidence_score"], 80)
        self.assertGreater(len(rca["evidence_chain"]), 0)
        self.assertGreater(len(rca["recommended_actions"]), 0)

        # 3. Execute approved remediation
        action = rca["recommended_actions"][0]
        rem_res = remediation_engine.execute_action(
            action_id=action["id"],
            target_id=action["target_id"],
            action_type=action["action_type"],
            command=action["command"]
        )
        self.assertEqual(rem_res["status"], "SUCCESS")
        self.assertIn("verification", rem_res)

        # 4. Post-remediation: System should return to healthy
        post_rca = ai_rca_engine.analyze_incident()
        self.assertEqual(post_rca["status"], "HEALTHY")

    def test_chat_copilot(self):
        res = self.client.post("/api/v1/chat", json={"message": "Why is the application slow?"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["role"], "assistant")
        self.assertIn("content", data)

if __name__ == "__main__":
    unittest.main()
