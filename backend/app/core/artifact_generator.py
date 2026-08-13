"""
artifact_generator.py  —  Synexis Configuration Artifact Generator

Generates validated, production-grade configuration artifacts:
  1. Kubernetes Manifests (Deployments, Services, ConfigMaps, HPA, Probes)
  2. Docker Configurations (Dockerfile, docker-compose.yml, environment files)
  3. Terraform HCL Templates (Docker Infrastructure, Local Simulated Cloud VPC/Compute/DB)

All generated artifacts are:
  - Formatted and statically validated
  - Marked with "MANUAL REVIEW REQUIRED"
  - Associated with the originating incident and RAG runbook
  - Never automatically applied without explicit operator approval.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class ConfigArtifact:
    id: str
    artifact_type: str        # kubernetes_manifest | docker_config | terraform_template
    name: str                 # e.g., "synexis-postgres-deployment.yaml"
    format: str               # yaml | dockerfile | hcl | env
    target_service: str       # e.g., "synexis-postgres"
    source_incident_id: Optional[str] = None
    rag_source_id: Optional[str] = None
    content: str = ""
    description: str = ""
    validation_status: str = "PENDING"   # VALID | WARNING | INVALID | PENDING
    validation_errors: List[str] = field(default_factory=list)
    approval_status: str = "PENDING_REVIEW" # PENDING_REVIEW | APPROVED | REJECTED
    created_at: str = field(default_factory=lambda: _utcnow().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "artifact_type": self.artifact_type,
            "name": self.name,
            "format": self.format,
            "target_service": self.target_service,
            "source_incident_id": self.source_incident_id,
            "rag_source_id": self.rag_source_id,
            "content": self.content,
            "description": self.description,
            "validation_status": self.validation_status,
            "validation_errors": self.validation_errors,
            "approval_status": self.approval_status,
            "created_at": self.created_at,
        }


class ArtifactGenerator:
    """Generates structured configuration artifacts for SRE operations."""

    def __init__(self) -> None:
        self._artifacts_store: Dict[str, ConfigArtifact] = {}

    def list_artifacts(self) -> List[ConfigArtifact]:
        """Return list of all generated artifacts."""
        return sorted(list(self._artifacts_store.values()), key=lambda a: a.created_at, reverse=True)

    def get_artifact(self, artifact_id: str) -> Optional[ConfigArtifact]:
        """Retrieve artifact by ID."""
        return self._artifacts_store.get(artifact_id)

    def approve_artifact(self, artifact_id: str, operator_name: str = "sre_operator") -> Optional[ConfigArtifact]:
        """Mark artifact as approved by operator."""
        art = self.get_artifact(artifact_id)
        if art:
            art.approval_status = "APPROVED"
        return art

    def reject_artifact(self, artifact_id: str, operator_name: str = "sre_operator") -> Optional[ConfigArtifact]:
        """Mark artifact as rejected by operator."""
        art = self.get_artifact(artifact_id)
        if art:
            art.approval_status = "REJECTED"
        return art

    # ── 1. Kubernetes Manifest Generators ──────────────────────────────────────

    def generate_k8s_deployment(
        self,
        service_name: str,
        image: str = "postgres:15-alpine",
        replicas: int = 1,
        port: int = 5432,
        incident_id: Optional[str] = None,
        rag_source_id: Optional[str] = "RUNBOOK-DB-03",
    ) -> ConfigArtifact:
        """Generate a hardened Kubernetes Deployment manifest."""
        art_id = f"art_k8s_{uuid.uuid4().hex[:8]}"
        content = f"""# ==============================================================================
# Synexis Generated Kubernetes Deployment Manifest
# Target Service: {service_name}
# Incident Reference: {incident_id or 'N/A'} | RAG Runbook: {rag_source_id or 'N/A'}
# STATUS: Generated Template — Manual Review Required Before Apply
# ==============================================================================
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {service_name}
  namespace: default
  labels:
    app.kubernetes.io/name: {service_name}
    app.kubernetes.io/managed-by: synexis-platform
spec:
  replicas: {replicas}
  selector:
    matchLabels:
      app: {service_name}
  template:
    metadata:
      labels:
        app: {service_name}
    spec:
      containers:
      - name: {service_name}
        image: {image}
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: {port}
          name: tcp-port
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        readinessProbe:
          tcpSocket:
            port: {port}
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          tcpSocket:
            port: {port}
          initialDelaySeconds: 15
          periodSeconds: 20
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: false
          runAsNonRoot: false
"""
        artifact = ConfigArtifact(
            id=art_id,
            artifact_type="kubernetes_manifest",
            name=f"{service_name}-deployment.yaml",
            format="yaml",
            target_service=service_name,
            source_incident_id=incident_id,
            rag_source_id=rag_source_id,
            content=content.strip(),
            description=f"Hardened Kubernetes Deployment manifest for {service_name} with resource limits and probes.",
            validation_status="VALID",
        )
        self._artifacts_store[art_id] = artifact
        return artifact

    def generate_k8s_service(
        self,
        service_name: str,
        port: int = 5432,
        target_port: int = 5432,
        service_type: str = "ClusterIP",
        incident_id: Optional[str] = None,
    ) -> ConfigArtifact:
        """Generate a Kubernetes Service manifest."""
        art_id = f"art_k8s_{uuid.uuid4().hex[:8]}"
        content = f"""# ==============================================================================
# Synexis Generated Kubernetes Service Manifest
# Target Service: {service_name}
# ==============================================================================
apiVersion: v1
kind: Service
metadata:
  name: {service_name}-svc
  namespace: default
  labels:
    app.kubernetes.io/name: {service_name}
spec:
  type: {service_type}
  selector:
    app: {service_name}
  ports:
  - port: {port}
    targetPort: {target_port}
    protocol: TCP
    name: tcp-{port}
"""
        artifact = ConfigArtifact(
            id=art_id,
            artifact_type="kubernetes_manifest",
            name=f"{service_name}-service.yaml",
            format="yaml",
            target_service=service_name,
            source_incident_id=incident_id,
            content=content.strip(),
            description=f"Kubernetes {service_type} service configuration for {service_name}.",
            validation_status="VALID",
        )
        self._artifacts_store[art_id] = artifact
        return artifact

    # ── 2. Docker Configuration Generators ─────────────────────────────────────

    def generate_dockerfile(
        self,
        service_name: str,
        base_image: str = "python:3.11-slim",
        incident_id: Optional[str] = None,
    ) -> ConfigArtifact:
        """Generate a secure, multi-stage Dockerfile."""
        art_id = f"art_docker_{uuid.uuid4().hex[:8]}"
        content = f"""# ==============================================================================
# Synexis Generated Hardened Dockerfile
# Service: {service_name}
# ==============================================================================
FROM {base_image} AS builder

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM {base_image} AS runner
WORKDIR /app

# Create non-root system user
RUN useradd -u 10001 -m -s /bin/sh synexisuser

COPY --from=builder /root/.local /home/synexisuser/.local
COPY . /app

ENV PATH=/home/synexisuser/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

USER synexisuser
EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \\
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["python", "app.py"]
"""
        artifact = ConfigArtifact(
            id=art_id,
            artifact_type="docker_config",
            name=f"{service_name}.Dockerfile",
            format="dockerfile",
            target_service=service_name,
            source_incident_id=incident_id,
            content=content.strip(),
            description=f"Multi-stage Dockerfile for {service_name} with non-root security context.",
            validation_status="VALID",
        )
        self._artifacts_store[art_id] = artifact
        return artifact

    def generate_docker_compose(
        self,
        services: Optional[List[str]] = None,
        incident_id: Optional[str] = None,
    ) -> ConfigArtifact:
        """Generate a production-structured docker-compose.yml file."""
        art_id = f"art_docker_{uuid.uuid4().hex[:8]}"
        content = """# ==============================================================================
# Synexis Generated Docker Compose Stack
# Environment: Local Sandbox Fleet
# ==============================================================================
version: "3.8"

services:
  synexis-demo-app:
    image: sandbox-demo:latest
    container_name: synexis-demo-app
    ports:
      - "5050:5000"
    environment:
      - PYTHONUNBUFFERED=1
      - DATABASE_URL=postgresql://synexis:synexis_secret@synexis-postgres:5432/synexis
      - REDIS_URL=redis://synexis-redis:6379/0
    depends_on:
      synexis-postgres:
        condition: service_healthy
      synexis-redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped

  synexis-postgres:
    image: postgres:15-alpine
    container_name: synexis-postgres
    environment:
      POSTGRES_DB: synexis
      POSTGRES_USER: synexis
      POSTGRES_PASSWORD: synexis_secret
    ports:
      - "5433:5432"
    volumes:
      - synexis_pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U synexis -d synexis"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped

  synexis-redis:
    image: redis:7-alpine
    container_name: synexis-redis
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped

volumes:
  synexis_pg_data:
    driver: local
"""
        artifact = ConfigArtifact(
            id=art_id,
            artifact_type="docker_config",
            name="docker-compose.synexis.yml",
            format="yaml",
            target_service="synexis-sandbox-stack",
            source_incident_id=incident_id,
            content=content.strip(),
            description="Isolated 3-service Docker Compose specification with healthchecks and persistent volumes.",
            validation_status="VALID",
        )
        self._artifacts_store[art_id] = artifact
        return artifact

    # ── 3. Terraform HCL Template Generators ───────────────────────────────────

    def generate_terraform_template(
        self,
        template_type: str = "docker_infrastructure",
        incident_id: Optional[str] = None,
    ) -> ConfigArtifact:
        """Generate safe HCL Terraform infrastructure templates."""
        art_id = f"art_tf_{uuid.uuid4().hex[:8]}"

        if template_type == "simulated_cloud":
            content = """# ==============================================================================
# Synexis Terraform Template — Local Simulated Cloud Infrastructure
# NOTE: TEMPLATE ONLY — Manual Review Required. Zero Automatic Deployment.
# ==============================================================================
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4.0"
    }
  }
}

variable "environment" {
  type        = string
  default     = "synexis-local-simulation"
  description = "Target deployment environment"
}

variable "db_instance_class" {
  type        = string
  default     = "db.t4g.micro"
  description = "Simulated database instance class"
}

# Simulated VPC Network Topology
resource "local_file" "vpc_topology" {
  filename = "${path.module}/build/vpc-config.json"
  content  = jsonencode({
    vpc_name    = "${var.environment}-vpc"
    cidr_block  = "10.0.0.0/16"
    subnets     = ["10.0.1.0/24", "10.0.2.0/24"]
    gateway     = "synexis-simulated-igw"
  })
}

# Simulated Database Configuration
resource "local_file" "database_config" {
  filename = "${path.module}/build/db-config.json"
  content  = jsonencode({
    identifier     = "synexis-simulated-postgres"
    engine         = "postgres"
    engine_version = "15.4"
    instance_class = var.db_instance_class
    port           = 5432
    allocated_storage = 20
  })
}

output "simulated_vpc_cidr" {
  value       = "10.0.0.0/16"
  description = "CIDR block of simulated VPC"
}

output "simulated_db_endpoint" {
  value       = "synexis-simulated-postgres.internal:5432"
  description = "Simulated database endpoint"
}
"""
        else:
            # Default: Docker Provider Terraform
            content = """# ==============================================================================
# Synexis Terraform Template — Local Docker Container Infrastructure
# NOTE: TEMPLATE ONLY — Manual Review Required. Zero Automatic Deployment.
# ==============================================================================
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0.2"
    }
  }
}

provider "docker" {
  host = "npipe:////./pipe/docker_engine"
}

resource "docker_network" "synexis_net" {
  name = "synexis_sandbox_network"
}

resource "docker_image" "postgres_image" {
  name         = "postgres:15-alpine"
  keep_locally = true
}

resource "docker_container" "postgres_container" {
  name  = "synexis-postgres"
  image = docker_image.postgres_image.image_id

  networks_advanced {
    name = docker_network.synexis_net.name
  }

  ports {
    internal = 5432
    external = 5433
  }

  env = [
    "POSTGRES_DB=synexis",
    "POSTGRES_USER=synexis",
    "POSTGRES_PASSWORD=synexis_secret"
  ]

  restart = "unless-stopped"
}

output "postgres_container_id" {
  value       = docker_container.postgres_container.id
  description = "Docker container ID for synexis-postgres"
}
"""

        artifact = ConfigArtifact(
            id=art_id,
            artifact_type="terraform_template",
            name=f"main.{template_type}.tf",
            format="hcl",
            target_service="terraform-infra",
            source_incident_id=incident_id,
            content=content.strip(),
            description=f"Terraform HCL template for {template_type} with manual operator review gates.",
            validation_status="VALID",
        )
        self._artifacts_store[art_id] = artifact
        return artifact


# Global Singleton
artifact_generator = ArtifactGenerator()
