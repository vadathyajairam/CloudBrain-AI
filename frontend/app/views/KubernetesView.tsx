"use client";

import React, { useState, useEffect } from "react";
import { Cpu, RefreshCw, Layers, Server, AlertTriangle, ShieldCheck, Box } from "lucide-react";
import { api } from "../lib/api";
import { Card, Badge, StatusBadge, ActionButton, EmptyState } from "../components/UIComponents";

export const KubernetesView: React.FC = () => {
  const [k8sStatus, setK8sStatus] = useState<any>(null);
  const [pods, setPods] = useState<any[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadK8sData = async () => {
    setLoading(true);
    try {
      const [statusRes, podsRes, depsRes, svcsRes, anomRes] = await Promise.all([
        api.getK8sStatus(),
        api.getK8sPods(),
        api.getK8sDeployments(),
        api.getK8sServices(),
        api.getK8sAnomalies(),
      ]);
      setK8sStatus(statusRes);
      if (podsRes?.pods) setPods(podsRes.pods);
      if (depsRes?.deployments) setDeployments(depsRes.deployments);
      if (svcsRes?.services) setServices(svcsRes.services);
      if (anomRes?.anomalies) setAnomalies(anomRes.anomalies);
    } catch (err) {
      console.error("Error loading K8s telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadK8sData();
  }, []);

  const isConnected = k8sStatus?.connected ?? false;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600" />
              Local Kubernetes Provider
            </h1>
            <StatusBadge status={isConnected ? "CONNECTED" : "OFFLINE"} />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Native monitoring of Pods, Deployments, Services, and cluster anomaly evaluation
          </p>
        </div>
        <ActionButton variant="outline" size="sm" icon={RefreshCw} onClick={loadK8sData} isLoading={loading}>
          Refresh Cluster
        </ActionButton>
      </div>

      {/* Cluster Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="text-xs font-semibold text-slate-500">Provider Status</div>
          <div className="text-lg font-bold text-slate-900 font-mono mt-1">
            {k8sStatus?.provider_name || "Kubernetes API"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {isConnected ? "Cluster Connected" : "NOT CONNECTED (Graceful)"}
          </div>
        </Card>

        <Card padding="sm">
          <div className="text-xs font-semibold text-slate-500">Pods Monitored</div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">{pods.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Namespace: default</div>
        </Card>

        <Card padding="sm">
          <div className="text-xs font-semibold text-slate-500">Deployments</div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">{deployments.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Active specs</div>
        </Card>

        <Card padding="sm">
          <div className="text-xs font-semibold text-slate-500">K8s Anomalies</div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">{anomalies.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Evaluated rules</div>
        </Card>
      </div>

      {/* Cluster Telemetry Body */}
      {isConnected ? (
        <div className="space-y-6">
          <Card padding="md">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Active Kubernetes Pods</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                    <th className="py-2 px-3">Pod Name</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Restarts</th>
                    <th className="py-2 px-3">IP</th>
                    <th className="py-2 px-3">Node</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pods.map((p) => (
                    <tr key={p.name}>
                      <td className="py-2 px-3 font-semibold text-slate-800">{p.name}</td>
                      <td className="py-2 px-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-2 px-3">{p.restart_count}</td>
                      <td className="py-2 px-3 text-slate-500">{p.ip || "—"}</td>
                      <td className="py-2 px-3 text-slate-500">{p.node || "local"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <EmptyState
          title="Local Kubernetes Provider Disconnected"
          description="Native local Kubernetes support (Docker Desktop K8s, Minikube, Kind). Reports status gracefully when offline."
          codeSnippet="minikube start OR enable Kubernetes in Docker Desktop"
          icon={Cpu}
        />
      )}
    </div>
  );
};
