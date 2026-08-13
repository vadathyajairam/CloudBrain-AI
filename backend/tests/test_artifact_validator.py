import unittest
from backend.app.core.artifact_validator import ArtifactValidator
from backend.app.core.artifact_generator import ArtifactGenerator

class TestArtifactValidator(unittest.TestCase):
    def setUp(self):
        self.validator = ArtifactValidator()
        self.generator = ArtifactGenerator()

    def test_validate_valid_k8s_deployment(self):
        art = self.generator.generate_k8s_deployment("synexis-postgres")
        report = self.validator.validate_k8s_manifest(art.content)
        self.assertTrue(report.is_valid)
        self.assertIn(report.status, ("VALID", "WARNING"))
        self.assertEqual(len(report.errors), 0)

    def test_validate_invalid_k8s_missing_kind(self):
        invalid_yaml = """apiVersion: apps/v1
metadata:
  name: broken-app
"""
        report = self.validator.validate_k8s_manifest(invalid_yaml)
        self.assertFalse(report.is_valid)
        self.assertEqual(report.status, "INVALID")
        self.assertTrue(any("kind" in e for e in report.errors))

    def test_validate_dockerfile(self):
        art = self.generator.generate_dockerfile("synexis-demo-app")
        report = self.validator.validate_dockerfile(art.content)
        self.assertTrue(report.is_valid)
        self.assertEqual(len(report.errors), 0)

    def test_validate_dockerfile_missing_from(self):
        invalid_dockerfile = """WORKDIR /app
CMD ["python", "app.py"]"""
        report = self.validator.validate_dockerfile(invalid_dockerfile)
        self.assertFalse(report.is_valid)
        self.assertTrue(any("FROM" in e for e in report.errors))

    def test_validate_docker_compose(self):
        art = self.generator.generate_docker_compose()
        report = self.validator.validate_docker_compose(art.content)
        self.assertTrue(report.is_valid)
        self.assertEqual(len(report.errors), 0)

    def test_validate_terraform(self):
        art = self.generator.generate_terraform_template("docker_infrastructure")
        report = self.validator.validate_terraform(art.content)
        self.assertTrue(report.is_valid)
        self.assertEqual(len(report.errors), 0)

    def test_validate_terraform_mismatched_braces(self):
        broken_hcl = """terraform {
  required_version = ">= 1.5.0"
"""
        report = self.validator.validate_terraform(broken_hcl)
        self.assertFalse(report.is_valid)
        self.assertTrue(any("braces" in e.lower() for e in report.errors))
