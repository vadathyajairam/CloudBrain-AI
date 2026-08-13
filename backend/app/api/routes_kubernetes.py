"""
routes_kubernetes.py  —  FastAPI router for local Kubernetes telemetry & anomalies
"""
from __future__ import annotations

from typing import Any, Dict, List
from fastapi import APIRouter

from backend.app.core.kubernetes_provider import kubernetes_provider

router = APIRouter(prefix="/k8s", tags=["Kubernetes Monitoring"])


@router.get("/status")
def get_k8s_status() -> Dict[str, Any]:
    """Get connection status of local Kubernetes environment."""
    return kubernetes_provider.get_cluster_status()


@router.get("/pods")
def list_pods(namespace: str = "default") -> Dict[str, Any]:
    """List pods in namespace."""
    pods = kubernetes_provider.list_pods(namespace)
    return {
        "namespace": namespace,
        "count": len(pods),
        "pods": [p.to_dict() for p in pods],
    }


@router.get("/deployments")
def list_deployments(namespace: str = "default") -> Dict[str, Any]:
    """List deployments in namespace."""
    deployments = kubernetes_provider.list_deployments(namespace)
    return {
        "namespace": namespace,
        "count": len(deployments),
        "deployments": [d.to_dict() for d in deployments],
    }


@router.get("/services")
def list_services(namespace: str = "default") -> Dict[str, Any]:
    """List services in namespace."""
    services = kubernetes_provider.list_services(namespace)
    return {
        "namespace": namespace,
        "count": len(services),
        "services": [s.to_dict() for s in services],
    }


@router.get("/logs/{pod_name}")
def get_pod_logs(pod_name: str, namespace: str = "default", tail: int = 50) -> Dict[str, Any]:
    """Fetch recent logs for a pod."""
    logs = kubernetes_provider.get_pod_logs(pod_name, namespace, tail)
    return {
        "pod_name": pod_name,
        "namespace": namespace,
        "lines_count": len(logs),
        "logs": logs,
    }


@router.get("/anomalies")
def get_k8s_anomalies(namespace: str = "default") -> Dict[str, Any]:
    """Evaluate Kubernetes anomaly rules."""
    anomalies = kubernetes_provider.evaluate_k8s_anomalies(namespace)
    return {
        "namespace": namespace,
        "anomaly_count": len(anomalies),
        "anomalies": anomalies,
    }
