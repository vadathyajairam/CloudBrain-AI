import unittest
from backend.app.core.artifact_generator import ArtifactGenerator

class TestArtifactGenerator(unittest.TestCase):
    def setUp(self):
        self.generator = ArtifactGenerator()

    def test_generate_k8s_deployment(self):
        art = self.generator.generate_k8s_deployment(
            service_name="synexis-postgres",
            image="postgres:15-alpine",
            replicas=1,
            port=5432,
            incident_id="INC-00042",
        )
        self.assertEqual(art.artifact_type, "kubernetes_manifest")
        self.assertIn("apiVersion: apps/v1", art.content)
        self.assertIn("kind: Deployment", art.content)
        self.assertIn("synexis-postgres", art.content)
        self.assertEqual(art.source_incident_id, "INC-00042")
        self.assertEqual(art.approval_status, "PENDING_REVIEW")

    def test_generate_k8s_service(self):
        art = self.generator.generate_k8s_service(
            service_name="synexis-demo-app",
            port=5000,
            target_port=5000,
        )
        self.assertEqual(art.artifact_type, "kubernetes_manifest")
        self.assertIn("kind: Service", art.content)
        self.assertIn("synexis-demo-app-svc", art.content)

    def test_generate_dockerfile(self):
        art = self.generator.generate_dockerfile(
            service_name="synexis-demo-app",
            base_image="python:3.11-slim",
        )
        self.assertEqual(art.artifact_type, "docker_config")
        self.assertIn("FROM python:3.11-slim", art.content)
        self.assertIn("USER synexisuser", art.content)
        self.assertIn("HEALTHCHECK", art.content)

    def test_generate_docker_compose(self):
        art = self.generator.generate_docker_compose()
        self.assertEqual(art.artifact_type, "docker_config")
        self.assertIn("version: \"3.8\"", art.content)
        self.assertIn("synexis-demo-app:", art.content)
        self.assertIn("synexis-postgres:", art.content)
        self.assertIn("synexis-redis:", art.content)

    def test_generate_terraform_template(self):
        art_docker = self.generator.generate_terraform_template("docker_infrastructure")
        self.assertEqual(art_docker.artifact_type, "terraform_template")
        self.assertIn("terraform {", art_docker.content)
        self.assertIn("kreuzwerker/docker", art_docker.content)

        art_cloud = self.generator.generate_terraform_template("simulated_cloud")
        self.assertIn("synexis-simulated-postgres", art_cloud.content)

    def test_approve_and_reject_artifact(self):
        art = self.generator.generate_k8s_deployment(service_name="test-app")
        self.assertEqual(art.approval_status, "PENDING_REVIEW")

        self.generator.approve_artifact(art.id, "sre_operator")
        self.assertEqual(art.approval_status, "APPROVED")

        self.generator.reject_artifact(art.id, "sre_operator")
        self.assertEqual(art.approval_status, "REJECTED")
