import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.monitoring import monitoring_engine
from backend.app.core.container_engine import container_engine
from backend.app.core.chaos_engine import chaos_engine, CHAOS_SCENARIOS
from backend.app.core.ai_rca_engine import ai_rca_engine
from backend.app.core.config_analyzer import config_analyzer, SAMPLE_CONFIGS

class TestSynexisBackend(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("health_score", data)
        self.assertIn("docker_connected", data)

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
        self.assertIsInstance(containers, list)
        
        info = container_engine.docker_info()
        self.assertIn("docker_available", info)
        self.assertIn("containers_running", info)
        self.assertIn("containers_total", info)

    def test_config_analyzer_docker_compose(self):
        vulnerable_compose = SAMPLE_CONFIGS["docker_compose_vulnerable"]
        audit = config_analyzer.audit_config("docker-compose", vulnerable_compose)
        self.assertIn("score", audit)
        self.assertIn("issues", audit)
        # Must detect port collision and privileged container
        titles = [i["title"] for i in audit["issues"]]
        self.assertTrue(any("Port Collision" in t for t in titles))
        self.assertTrue(any("Privileged Mode" in t for t in titles))

    def test_chaos_catalog_and_rca(self):
        # 1. Scenarios catalogue contains 5 scenarios
        scenarios = chaos_engine.get_scenarios()
        self.assertIn("scenarios", scenarios)
        self.assertEqual(len(scenarios["scenarios"]), 5)
        self.assertIn("cpu_stress", CHAOS_SCENARIOS)
        self.assertIn("error_burst", CHAOS_SCENARIOS)
        self.assertIn("memory_pressure", CHAOS_SCENARIOS)
        self.assertIn("slow_responses", CHAOS_SCENARIOS)
        self.assertIn("db_stop", CHAOS_SCENARIOS)

        # 2. RCA analysis returns valid structured analysis
        rca = ai_rca_engine.analyze_incident()
        self.assertIn("incident_id", rca)
        self.assertIn("status", rca)
        self.assertIn("root_cause", rca)
        self.assertIn("evidence_bundle", rca)
        self.assertIn("structured_actions", rca)

    def test_chat_copilot(self):
        res = self.client.post("/api/v1/chat", json={"message": "Why is the application slow?"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["role"], "assistant")
        self.assertIn("content", data)

if __name__ == "__main__":
    unittest.main()
