"""
infrastructure_provider.py  —  Synexis Infrastructure Provider Hierarchy

Defines the polymorphic provider interface:
  InfrastructureProvider (Abstract)
    ├── DockerProvider (Local Docker SDK & psutil)
    ├── KubernetesProvider (Local K8s / Minikube)
    ├── SimulatedCloudProvider (Local Cloud-Style Topology)
    └── ExternalCloudProviderStubs (AWS / Azure / GCP — explicitly unconfigured)
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List

from backend.app.core.cloud_simulator import cloud_simulator
from backend.app.core.container_engine import container_engine
from backend.app.core.kubernetes_provider import kubernetes_provider
from backend.app.core.monitoring import monitoring_engine


class InfrastructureProvider(ABC):
    """Abstract base class for all Synexis infrastructure providers."""

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return unique provider identifier."""
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Return connectivity and health summary."""
        pass

    @abstractmethod
    def list_resources(self) -> List[Dict[str, Any]]:
        """List active compute/container/cloud resources."""
        pass


class DockerProvider(InfrastructureProvider):
    """Wraps Docker Engine SDK & local host telemetry."""

    def get_provider_name(self) -> str:
        return "docker"

    def get_status(self) -> Dict[str, Any]:
        info = container_engine.docker_info()
        return {
            "provider": "docker",
            "name": "Docker Engine Daemon",
            "connected": info.get("docker_available", False),
            "status": "CONNECTED" if info.get("docker_available", False) else "NOT CONNECTED",
            "containers_running": info.get("containers_running", 0),
            "version": info.get("version", "N/A"),
        }

    def list_resources(self) -> List[Dict[str, Any]]:
        containers = container_engine.list_containers()
        return [c.to_dict() for c in containers]


class K8sProviderWrapper(InfrastructureProvider):
    """Wraps local Kubernetes provider."""

    def get_provider_name(self) -> str:
        return "kubernetes"

    def get_status(self) -> Dict[str, Any]:
        return kubernetes_provider.get_cluster_status()

    def list_resources(self) -> List[Dict[str, Any]]:
        pods = kubernetes_provider.list_pods()
        return [p.to_dict() for p in pods]


class SimulatedCloudProviderWrapper(InfrastructureProvider):
    """Wraps local cloud topology simulator."""

    def get_provider_name(self) -> str:
        return "simulated_cloud"

    def get_status(self) -> Dict[str, Any]:
        return cloud_simulator.get_status()

    def list_resources(self) -> List[Dict[str, Any]]:
        resources = cloud_simulator.list_resources()
        return [r.to_dict() for r in resources]


class ExternalCloudStubProvider(InfrastructureProvider):
    """Explicitly models unconfigured external cloud providers."""

    def __init__(self, cloud_name: str) -> None:
        self._cloud_name = cloud_name

    def get_provider_name(self) -> str:
        return self._cloud_name.lower()

    def get_status(self) -> Dict[str, Any]:
        return {
            "provider": self._cloud_name.lower(),
            "name": f"{self._cloud_name.upper()} Cloud Connector",
            "connected": False,
            "status": "NOT CONNECTED",
            "reason": "Optional external cloud connector. Unconfigured in local academic demo.",
        }

    def list_resources(self) -> List[Dict[str, Any]]:
        return []


# Provider Registry
class ProviderRegistry:
    def __init__(self) -> None:
        self._providers: Dict[str, InfrastructureProvider] = {
            "docker": DockerProvider(),
            "kubernetes": K8sProviderWrapper(),
            "simulated_cloud": SimulatedCloudProviderWrapper(),
            "aws": ExternalCloudStubProvider("AWS"),
            "azure": ExternalCloudStubProvider("Azure"),
            "gcp": ExternalCloudStubProvider("GCP"),
        }

    def get_provider(self, name: str) -> InfrastructureProvider | None:
        return self._providers.get(name.lower())

    def get_all_statuses(self) -> List[Dict[str, Any]]:
        return [p.get_status() for p in self._providers.values()]


# Global Singleton Registry
provider_registry = ProviderRegistry()
