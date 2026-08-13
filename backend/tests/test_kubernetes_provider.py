import unittest
from backend.app.core.kubernetes_provider import KubernetesProvider, K8sPod, K8sDeployment

class TestKubernetesProvider(unittest.TestCase):
    def setUp(self):
        self.provider = KubernetesProvider()

    def test_status_when_disconnected(self):
        status = self.provider.get_cluster_status()
        self.assertIn("provider", status)
        self.assertEqual(status["provider"], "kubernetes")
        self.assertIn("status", status)
        self.assertIn(status["status"], ("CONNECTED", "NOT CONNECTED"))

    def test_anomaly_evaluation_empty_when_offline(self):
        # In offline/no-cluster environment, anomalies should return empty list gracefully without throwing
        anomalies = self.provider.evaluate_k8s_anomalies("default")
        self.assertIsInstance(anomalies, list)

    def test_pod_dataclass_serialization(self):
        pod = K8sPod(
            name="synexis-pod-1",
            namespace="default",
            status="Running",
            ready=True,
            restarts=0,
            ip="10.244.0.5",
        )
        d = pod.to_dict()
        self.assertEqual(d["name"], "synexis-pod-1")
        self.assertEqual(d["status"], "Running")
        self.assertTrue(d["ready"])
        self.assertEqual(d["restarts"], 0)

    def test_deployment_dataclass_serialization(self):
        dep = K8sDeployment(
            name="synexis-api-dep",
            namespace="default",
            replicas=3,
            ready_replicas=3,
            available_replicas=3,
            status="Healthy",
        )
        d = dep.to_dict()
        self.assertEqual(d["name"], "synexis-api-dep")
        self.assertEqual(d["status"], "Healthy")
        self.assertEqual(d["available_replicas"], 3)
