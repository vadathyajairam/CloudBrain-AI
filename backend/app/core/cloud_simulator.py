"""
cloud_simulator.py  —  Synexis Local Cloud-Style Simulation Engine

Simulates cloud-native infrastructure concepts locally (Virtual VPC, Compute instances,
Managed Database, Managed Redis Cache, and CloudWatch-style metric logs) without requiring
paid cloud credentials.

Explicitly labeled:
  "LOCAL SIMULATION"
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class SimulatedResource:
    resource_id: str
    resource_type: str        # vpc | compute_instance | managed_database | managed_cache | load_balancer
    name: str
    region: str = "synexis-local-1"
    status: str = "AVAILABLE" # AVAILABLE | DEGRADED | STOPPED
    spec: Dict[str, Any] = field(default_factory=dict)
    metrics: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: _utcnow().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "resource_id": self.resource_id,
            "resource_type": self.resource_type,
            "name": self.name,
            "region": self.region,
            "status": self.status,
            "spec": self.spec,
            "metrics": self.metrics,
            "created_at": self.created_at,
        }


class CloudSimulator:
    """Provides an isolated local simulation of cloud infrastructure topologies."""

    def __init__(self) -> None:
        self._connected: bool = True
        self._resources: Dict[str, SimulatedResource] = {}
        self._initialize_default_topology()

    def _initialize_default_topology(self) -> None:
        """Set up standard cloud-style simulation topology."""
        # 1. Virtual VPC
        self._resources["vpc-01"] = SimulatedResource(
            resource_id="vpc-01",
            resource_type="vpc",
            name="synexis-simulated-vpc",
            spec={
                "cidr_block": "10.0.0.0/16",
                "subnets": ["10.0.1.0/24 (public)", "10.0.2.0/24 (private)"],
                "security_groups": ["sg-default", "sg-database"],
            },
            status="AVAILABLE",
        )

        # 2. Virtual Compute Instance
        self._resources["vm-01"] = SimulatedResource(
            resource_id="vm-01",
            resource_type="compute_instance",
            name="synexis-simulated-app-vm",
            spec={
                "instance_type": "t4g.small",
                "vcpus": 2,
                "memory_gb": 2.0,
                "ip": "10.0.1.15",
            },
            metrics={"cpu_percent": 14.2, "memory_percent": 42.0},
            status="AVAILABLE",
        )

        # 3. Managed Database
        self._resources["db-01"] = SimulatedResource(
            resource_id="db-01",
            resource_type="managed_database",
            name="synexis-simulated-postgres-primary",
            spec={
                "engine": "PostgreSQL",
                "version": "15.4",
                "instance_class": "db.t4g.micro",
                "allocated_storage_gb": 20,
                "endpoint": "postgres.synexis-local.internal:5432",
            },
            metrics={"active_connections": 8, "storage_used_gb": 4.2},
            status="AVAILABLE",
        )

        # 4. Managed Redis Cache
        self._resources["cache-01"] = SimulatedResource(
            resource_id="cache-01",
            resource_type="managed_cache",
            name="synexis-simulated-redis-cache",
            spec={
                "engine": "Redis",
                "version": "7.0",
                "node_type": "cache.t4g.micro",
                "endpoint": "redis.synexis-local.internal:6379",
            },
            metrics={"memory_used_mb": 28.5, "hit_rate_percent": 96.4},
            status="AVAILABLE",
        )

    def get_status(self) -> Dict[str, Any]:
        """Return simulation connection status."""
        return {
            "provider": "simulated_cloud",
            "connected": self._connected,
            "status": "CONNECTED (Local Simulation)",
            "label": "Local Cloud Environment Simulation",
            "resource_count": len(self._resources),
            "region": "synexis-local-1",
            "disclaimer": "Local simulation for academic study. No cloud credentials required.",
        }

    def list_resources(self) -> List[SimulatedResource]:
        """List all simulated cloud resources."""
        return list(self._resources.values())

    def inject_resource_failure(self, resource_id: str) -> bool:
        """Simulate failure of a cloud resource for testing."""
        if resource_id in self._resources:
            self._resources[resource_id].status = "DEGRADED"
            return True
        return False

    def recover_resource(self, resource_id: str) -> bool:
        """Restore simulated cloud resource to healthy status."""
        if resource_id in self._resources:
            self._resources[resource_id].status = "AVAILABLE"
            return True
        return False


# Global Singleton
cloud_simulator = CloudSimulator()
