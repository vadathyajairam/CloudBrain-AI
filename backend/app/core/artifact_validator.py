"""
artifact_validator.py  —  Synexis Configuration Artifact Validation Engine

Validates generated configuration artifacts:
  - Kubernetes Manifests (YAML syntax, required metadata, specs, resource limits, probes)
  - Docker Configurations (Dockerfile structure, non-root user, compose syntax)
  - Terraform Templates (HCL blocks, provider, resource, outputs)
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import yaml


@dataclass
class ValidationReport:
    is_valid: bool
    status: str              # VALID | WARNING | INVALID
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "status": self.status,
            "errors": self.errors,
            "warnings": self.warnings,
            "details": self.details,
        }


class ArtifactValidator:
    """Performs static syntax and safety validation on configuration artifacts."""

    def validate_artifact(self, artifact_type: str, content: str) -> ValidationReport:
        """Validate artifact based on its type."""
        if not content or not content.strip():
            return ValidationReport(
                is_valid=False,
                status="INVALID",
                errors=["Artifact content is empty."],
            )

        if artifact_type == "kubernetes_manifest":
            return self.validate_k8s_manifest(content)
        elif artifact_type == "docker_config":
            if "FROM " in content:
                return self.validate_dockerfile(content)
            return self.validate_docker_compose(content)
        elif artifact_type == "terraform_template":
            return self.validate_terraform(content)
        else:
            return self.validate_generic_yaml(content)

    def validate_k8s_manifest(self, yaml_content: str) -> ValidationReport:
        """Validate Kubernetes YAML manifest structure and best practices."""
        errors: List[str] = []
        warnings: List[str] = []

        try:
            docs = list(yaml.safe_load_all(yaml_content))
        except yaml.YAMLError as e:
            return ValidationReport(
                is_valid=False,
                status="INVALID",
                errors=[f"YAML syntax error: {str(e)}"],
            )

        if not docs or docs[0] is None:
            return ValidationReport(
                is_valid=False,
                status="INVALID",
                errors=["No valid YAML documents found."],
            )

        for i, doc in enumerate(docs):
            if not isinstance(doc, dict):
                errors.append(f"Document #{i+1} is not a valid YAML mapping.")
                continue

            # Check required top-level fields
            if "apiVersion" not in doc:
                errors.append(f"Missing required 'apiVersion' in document #{i+1}.")
            if "kind" not in doc:
                errors.append(f"Missing required 'kind' in document #{i+1}.")
            if "metadata" not in doc or not isinstance(doc.get("metadata"), dict):
                errors.append(f"Missing required 'metadata' block in document #{i+1}.")
            elif "name" not in doc["metadata"]:
                errors.append(f"Missing 'metadata.name' in document #{i+1}.")

            kind = doc.get("kind", "")
            if kind == "Deployment":
                spec = doc.get("spec", {})
                template = spec.get("template", {})
                pod_spec = template.get("spec", {})
                containers = pod_spec.get("containers", [])

                if not containers:
                    errors.append("Deployment has no containers defined in 'spec.template.spec.containers'.")
                else:
                    for c in containers:
                        c_name = c.get("name", "unnamed")
                        if "image" not in c:
                            errors.append(f"Container '{c_name}' has no image defined.")
                        
                        # Best practices checks
                        if "resources" not in c:
                            warnings.append(f"Container '{c_name}' lacks resource limits and requests.")
                        if "readinessProbe" not in c:
                            warnings.append(f"Container '{c_name}' has no readinessProbe configured.")
                        if "livenessProbe" not in c:
                            warnings.append(f"Container '{c_name}' has no livenessProbe configured.")

        status = "INVALID" if errors else ("WARNING" if warnings else "VALID")
        return ValidationReport(
            is_valid=len(errors) == 0,
            status=status,
            errors=errors,
            warnings=warnings,
            details={"document_count": len(docs)},
        )

    def validate_dockerfile(self, content: str) -> ValidationReport:
        """Validate Dockerfile structure and security best practices."""
        errors: List[str] = []
        warnings: List[str] = []

        lines = [line.strip() for line in content.splitlines() if line.strip() and not line.strip().startswith("#")]

        if not any(line.startswith("FROM ") for line in lines):
            errors.append("Dockerfile must start with a 'FROM' instruction.")

        has_user = any(line.startswith("USER ") for line in lines)
        if not has_user:
            warnings.append("Container runs as root. Consider adding a non-root 'USER' instruction.")

        has_healthcheck = any(line.startswith("HEALTHCHECK ") for line in lines)
        if not has_healthcheck:
            warnings.append("Missing 'HEALTHCHECK' instruction for native container monitoring.")

        # Check for exposed hardcoded secrets pattern
        if re.search(r'(API_KEY|SECRET_KEY|PASSWORD|TOKEN)\s*=\s*["\'][^"\']+["\']', content, re.IGNORECASE):
            warnings.append("Potential hardcoded sensitive variable detected in Dockerfile.")

        status = "INVALID" if errors else ("WARNING" if warnings else "VALID")
        return ValidationReport(
            is_valid=len(errors) == 0,
            status=status,
            errors=errors,
            warnings=warnings,
            details={"line_count": len(lines)},
        )

    def validate_docker_compose(self, yaml_content: str) -> ValidationReport:
        """Validate docker-compose.yml structure."""
        errors: List[str] = []
        warnings: List[str] = []

        try:
            data = yaml.safe_load(yaml_content)
        except yaml.YAMLError as e:
            return ValidationReport(
                is_valid=False,
                status="INVALID",
                errors=[f"YAML syntax error: {str(e)}"],
            )

        if not isinstance(data, dict):
            return ValidationReport(
                is_valid=False,
                status="INVALID",
                errors=["docker-compose file must be a top-level YAML mapping."],
            )

        if "services" not in data or not isinstance(data.get("services"), dict):
            errors.append("Missing required 'services' block in docker-compose.")
        else:
            services = data.get("services", {})
            if not services:
                errors.append("'services' block is empty.")
            for s_name, s_cfg in services.items():
                if not isinstance(s_cfg, dict):
                    errors.append(f"Service '{s_name}' configuration must be a mapping.")
                    continue
                if "image" not in s_cfg and "build" not in s_cfg:
                    errors.append(f"Service '{s_name}' must specify either 'image' or 'build'.")

        status = "INVALID" if errors else ("WARNING" if warnings else "VALID")
        return ValidationReport(
            is_valid=len(errors) == 0,
            status=status,
            errors=errors,
            warnings=warnings,
            details={"service_count": len(data.get("services", {})) if isinstance(data, dict) else 0},
        )

    def validate_terraform(self, hcl_content: str) -> ValidationReport:
        """Validate HCL Terraform template structure."""
        errors: List[str] = []
        warnings: List[str] = []

        # Check balanced braces
        open_braces = hcl_content.count("{")
        close_braces = hcl_content.count("}")
        if open_braces != close_braces:
            errors.append(f"Mismatched braces in HCL template: {open_braces} open vs {close_braces} close.")

        # Check for standard blocks
        has_resource = "resource " in hcl_content
        has_terraform = "terraform " in hcl_content or "provider " in hcl_content
        if not has_resource and not has_terraform:
            warnings.append("Template contains no 'resource' or 'provider' blocks.")

        # Check for manual review disclaimer
        if "MANUAL" not in hcl_content and "REVIEW" not in hcl_content:
            warnings.append("Template lacks the explicit manual review safety banner.")

        status = "INVALID" if errors else ("WARNING" if warnings else "VALID")
        return ValidationReport(
            is_valid=len(errors) == 0,
            status=status,
            errors=errors,
            warnings=warnings,
            details={"open_braces": open_braces, "close_braces": close_braces},
        )

    def validate_generic_yaml(self, yaml_content: str) -> ValidationReport:
        """Validate generic YAML syntax."""
        try:
            yaml.safe_load(yaml_content)
            return ValidationReport(is_valid=True, status="VALID")
        except yaml.YAMLError as e:
            return ValidationReport(
                is_valid=False,
                status="INVALID",
                errors=[f"YAML parsing error: {str(e)}"],
            )


# Global Singleton
artifact_validator = ArtifactValidator()
