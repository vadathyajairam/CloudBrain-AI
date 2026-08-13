"""
kubernetes_provider.py  —  Synexis Local Kubernetes Provider & Telemetry Engine

Supports monitoring local Kubernetes environments (Docker Desktop K8s, Minikube, Kind, K3s)
via local kubeconfig or standard Kubernetes API/CLI fallback.

If Kubernetes is not running or unconfigured, it safely reports:
  connected: False, status: "NOT CONNECTED"
and preserves full Docker operations.
"""
from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger("synexis.kubernetes")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class K8sPod:
    name: str
    namespace: str
    status: str              # Running | Pending | Failed | CrashLoopBackOff | Succeeded
    ready: bool
    restarts: int
    cpu_usage: str = "N/A"
    memory_usage: str = "N/A"
    node: str = "local"
    ip: str = "N/A"
    age: str = "0s"
    containers: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "namespace": self.namespace,
            "status": self.status,
            "ready": self.ready,
            "restarts": self.restarts,
            "cpu_usage": self.cpu_usage,
            "memory_usage": self.memory_usage,
            "node": self.node,
            "ip": self.ip,
            "age": self.age,
            "containers": self.containers,
        }


@dataclass
class K8sDeployment:
    name: str
    namespace: str
    replicas: int
    ready_replicas: int
    available_replicas: int
    status: str              # Healthy | Degraded | Unavailable

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "namespace": self.namespace,
            "replicas": self.replicas,
            "ready_replicas": self.ready_replicas,
            "available_replicas": self.available_replicas,
            "status": self.status,
        }


@dataclass
class K8sService:
    name: str
    namespace: str
    type: str                # ClusterIP | NodePort | LoadBalancer
    cluster_ip: str
    ports: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "namespace": self.namespace,
            "type": self.type,
            "cluster_ip": self.cluster_ip,
            "ports": self.ports,
        }


@dataclass
class K8sEvent:
    reason: str
    message: str
    involved_object: str
    event_type: str          # Normal | Warning
    timestamp: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "reason": self.reason,
            "message": self.message,
            "involved_object": self.involved_object,
            "event_type": self.event_type,
            "timestamp": self.timestamp,
        }


class KubernetesProvider:
    """
    Manages telemetry, inspection, and anomaly detection for local Kubernetes environments.
    """

    def __init__(self) -> None:
        self._connected: bool = False
        self._cluster_info: Dict[str, Any] = {}
        self._last_checked: datetime = _utcnow()
        self._kubectl_path: Optional[str] = shutil.which("kubectl")
        self._mock_sandbox_mode: bool = False
        self._sandbox_pods: List[K8sPod] = []

    def is_available(self) -> bool:
        """Check if local Kubernetes cluster is reachable."""
        now = _utcnow()
        if hasattr(self, "_cached_available") and (now - self._last_checked).total_seconds() < 15:
            return self._cached_available

        self._last_checked = now
        if not self._kubectl_path:
            self._connected = False
            self._cached_available = False
            return False

        try:
            # Probe cluster info with short timeout
            res = subprocess.run(
                [self._kubectl_path, "cluster-info"],
                capture_output=True,
                text=True,
                timeout=2,
                check=False,
            )
            self._connected = (res.returncode == 0)
            self._cached_available = self._connected
            return self._connected
        except Exception:
            self._connected = False
            self._cached_available = False
            return False

    def get_cluster_status(self) -> Dict[str, Any]:
        """Return standardized cluster connection summary."""
        available = self.is_available()
        return {
            "provider": "kubernetes",
            "connected": available,
            "cluster_name": "local-k8s" if available else "none",
            "type": "Docker Desktop K8s / Minikube" if available else "unconnected",
            "kubectl_installed": bool(self._kubectl_path),
            "status": "CONNECTED" if available else "NOT CONNECTED",
            "last_checked": self._last_checked.isoformat(),
        }

    def list_pods(self, namespace: str = "default") -> List[K8sPod]:
        """List pods in the specified namespace."""
        if not self.is_available():
            return []

        try:
            res = subprocess.run(
                [self._kubectl_path, "get", "pods", "-n", namespace, "-o", "json"],
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
            )
            if res.returncode != 0 or not res.stdout.strip():
                return []

            data = json.loads(res.stdout)
            pods: List[K8sPod] = []
            for item in data.get("items", []):
                meta = item.get("metadata", {})
                status = item.get("status", {})
                spec = item.get("spec", {})

                # Container status evaluation
                c_statuses = status.get("containerStatuses", [])
                restarts = sum(cs.get("restartCount", 0) for cs in c_statuses)
                ready = all(cs.get("ready", False) for cs in c_statuses) if c_statuses else False

                phase = status.get("phase", "Unknown")
                # Check for CrashLoopBackOff or Error
                for cs in c_statuses:
                    waiting = cs.get("state", {}).get("waiting", {})
                    if waiting.get("reason") in ("CrashLoopBackOff", "ImagePullBackOff", "ErrImagePull"):
                        phase = waiting.get("reason")

                containers = [c.get("name") for c in spec.get("containers", [])]

                pods.append(
                    K8sPod(
                        name=meta.get("name", "unknown"),
                        namespace=meta.get("namespace", namespace),
                        status=phase,
                        ready=ready,
                        restarts=restarts,
                        ip=status.get("podIP", "N/A"),
                        node=spec.get("nodeName", "local-node"),
                        containers=[{"name": c} for c in containers],
                    )
                )
            return pods
        except Exception as e:
            logger.warning(f"Failed to list k8s pods: {e}")
            return []

    def list_deployments(self, namespace: str = "default") -> List[K8sDeployment]:
        """List deployments in the namespace."""
        if not self.is_available():
            return []

        try:
            res = subprocess.run(
                [self._kubectl_path, "get", "deployments", "-n", namespace, "-o", "json"],
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
            )
            if res.returncode != 0 or not res.stdout.strip():
                return []

            data = json.loads(res.stdout)
            deployments: List[K8sDeployment] = []
            for item in data.get("items", []):
                meta = item.get("metadata", {})
                spec = item.get("spec", {})
                status = item.get("status", {})

                replicas = spec.get("replicas", 1)
                ready_replicas = status.get("readyReplicas", 0)
                avail_replicas = status.get("availableReplicas", 0)

                dep_status = "Healthy" if ready_replicas == replicas and replicas > 0 else "Degraded"
                if avail_replicas == 0 and replicas > 0:
                    dep_status = "Unavailable"

                deployments.append(
                    K8sDeployment(
                        name=meta.get("name", "unknown"),
                        namespace=meta.get("namespace", namespace),
                        replicas=replicas,
                        ready_replicas=ready_replicas,
                        available_replicas=avail_replicas,
                        status=dep_status,
                    )
                )
            return deployments
        except Exception as e:
            logger.warning(f"Failed to list k8s deployments: {e}")
            return []

    def list_services(self, namespace: str = "default") -> List[K8sService]:
        """List services in the namespace."""
        if not self.is_available():
            return []

        try:
            res = subprocess.run(
                [self._kubectl_path, "get", "services", "-n", namespace, "-o", "json"],
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
            )
            if res.returncode != 0 or not res.stdout.strip():
                return []

            data = json.loads(res.stdout)
            services: List[K8sService] = []
            for item in data.get("items", []):
                meta = item.get("metadata", {})
                spec = item.get("spec", {})

                ports = [
                    f"{p.get('port', '')}:{p.get('targetPort', '')}/{p.get('protocol', 'TCP')}"
                    for p in spec.get("ports", [])
                ]

                services.append(
                    K8sService(
                        name=meta.get("name", "unknown"),
                        namespace=meta.get("namespace", namespace),
                        type=spec.get("type", "ClusterIP"),
                        cluster_ip=spec.get("clusterIP", "None"),
                        ports=ports,
                    )
                )
            return services
        except Exception as e:
            logger.warning(f"Failed to list k8s services: {e}")
            return []

    def get_pod_logs(self, pod_name: str, namespace: str = "default", tail_lines: int = 50) -> List[str]:
        """Fetch stdout/stderr logs from a specific pod."""
        if not self.is_available():
            return []

        try:
            res = subprocess.run(
                [self._kubectl_path, "logs", pod_name, "-n", namespace, f"--tail={tail_lines}"],
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
            )
            if res.returncode == 0 and res.stdout:
                return res.stdout.splitlines()
            return []
        except Exception as e:
            logger.warning(f"Failed to get pod logs for {pod_name}: {e}")
            return []

    def evaluate_k8s_anomalies(self, namespace: str = "default") -> List[Dict[str, Any]]:
        """
        Evaluate Kubernetes-specific anomaly detection rules:
          - pod_crash_loop
          - pod_failed
          - pod_not_ready
          - deployment_unavailable
          - excessive_pod_restarts
        """
        anomalies: List[Dict[str, Any]] = []
        if not self.is_available():
            return anomalies

        pods = self.list_pods(namespace)
        for pod in pods:
            if pod.status in ("CrashLoopBackOff", "Error", "ImagePullBackOff"):
                anomalies.append({
                    "rule_id": "pod_crash_loop",
                    "severity": "CRITICAL",
                    "title": f"Pod in CrashLoopBackOff: {pod.name}",
                    "affected_service": pod.name,
                    "target_type": "kubernetes_pod",
                    "evidence": {
                        "namespace": pod.namespace,
                        "status": pod.status,
                        "restarts": pod.restarts,
                        "ready": pod.ready,
                    },
                })
            elif pod.status == "Failed":
                anomalies.append({
                    "rule_id": "pod_failed",
                    "severity": "CRITICAL",
                    "title": f"Pod Failed: {pod.name}",
                    "affected_service": pod.name,
                    "target_type": "kubernetes_pod",
                    "evidence": {
                        "namespace": pod.namespace,
                        "status": pod.status,
                    },
                })
            elif not pod.ready and pod.status == "Running":
                anomalies.append({
                    "rule_id": "pod_not_ready",
                    "severity": "HIGH",
                    "title": f"Pod Readiness Probe Failing: {pod.name}",
                    "affected_service": pod.name,
                    "target_type": "kubernetes_pod",
                    "evidence": {
                        "namespace": pod.namespace,
                        "ready": False,
                    },
                })

            if pod.restarts >= 3:
                anomalies.append({
                    "rule_id": "excessive_pod_restarts",
                    "severity": "HIGH",
                    "title": f"Excessive Pod Restarts ({pod.restarts}): {pod.name}",
                    "affected_service": pod.name,
                    "target_type": "kubernetes_pod",
                    "evidence": {
                        "namespace": pod.namespace,
                        "restarts": pod.restarts,
                    },
                })

        # Check deployments
        deployments = self.list_deployments(namespace)
        for dep in deployments:
            if dep.status == "Unavailable":
                anomalies.append({
                    "rule_id": "deployment_unavailable",
                    "severity": "CRITICAL",
                    "title": f"Kubernetes Deployment Unavailable: {dep.name}",
                    "affected_service": dep.name,
                    "target_type": "kubernetes_deployment",
                    "evidence": {
                        "namespace": dep.namespace,
                        "replicas": dep.replicas,
                        "available_replicas": dep.available_replicas,
                    },
                })

        return anomalies


# Global Singleton
kubernetes_provider = KubernetesProvider()
