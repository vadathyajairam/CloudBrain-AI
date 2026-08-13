import unittest
from backend.app.core.cloud_simulator import CloudSimulator

class TestCloudSimulator(unittest.TestCase):
    def setUp(self):
        self.sim = CloudSimulator()

    def test_status_and_disclaimer(self):
        status = self.sim.get_status()
        self.assertEqual(status["provider"], "simulated_cloud")
        self.assertTrue(status["connected"])
        self.assertIn("Local Simulation", status["status"])
        self.assertIn("academic", status["disclaimer"].lower())

    def test_default_resources_created(self):
        resources = self.sim.list_resources()
        self.assertGreaterEqual(len(resources), 4)
        types = [r.resource_type for r in resources]
        self.assertIn("vpc", types)
        self.assertIn("compute_instance", types)
        self.assertIn("managed_database", types)
        self.assertIn("managed_cache", types)

    def test_inject_and_recover_resource(self):
        # Inject failure on db-01
        self.assertTrue(self.sim.inject_resource_failure("db-01"))
        res = [r for r in self.sim.list_resources() if r.resource_id == "db-01"][0]
        self.assertEqual(res.status, "DEGRADED")

        # Recover
        self.assertTrue(self.sim.recover_resource("db-01"))
        res = [r for r in self.sim.list_resources() if r.resource_id == "db-01"][0]
        self.assertEqual(res.status, "AVAILABLE")
