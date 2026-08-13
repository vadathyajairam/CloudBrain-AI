import unittest
from backend.app.core.infrastructure_provider import (
    provider_registry,
    DockerProvider,
    K8sProviderWrapper,
    SimulatedCloudProviderWrapper,
    ExternalCloudStubProvider,
)

class TestInfrastructureProviders(unittest.TestCase):
    def test_registry_providers_present(self):
        statuses = provider_registry.get_all_statuses()
        providers = [s["provider"] for s in statuses]
        self.assertIn("docker", providers)
        self.assertIn("kubernetes", providers)
        self.assertIn("simulated_cloud", providers)
        self.assertIn("aws", providers)
        self.assertIn("azure", providers)
        self.assertIn("gcp", providers)

    def test_external_cloud_stub_unconnected(self):
        aws = provider_registry.get_provider("aws")
        self.assertIsNotNone(aws)
        status = aws.get_status()
        self.assertFalse(status["connected"])
        self.assertEqual(status["status"], "NOT CONNECTED")
        self.assertIn("Unconfigured", status.get("reason", ""))

    def test_simulated_cloud_provider_status(self):
        sim = provider_registry.get_provider("simulated_cloud")
        self.assertIsNotNone(sim)
        status = sim.get_status()
        self.assertTrue(status["connected"])
        self.assertIn("Local Simulation", status["status"])
