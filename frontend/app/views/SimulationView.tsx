"use client";

import React, { useState, useEffect } from "react";
import { Cloud, RefreshCw, Server, Zap, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { Card, Badge, StatusBadge, ActionButton, EmptyState } from "../components/UIComponents";

export const SimulationView: React.FC = () => {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadResources = async () => {
    setLoading(true);
    try {
      const res = await api.getSimulatedResources();
      if (res?.resources) setResources(res.resources);
    } catch (err) {
      console.error("Error loading simulation resources:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const handleInject = async (id: string) => {
    setActionLoading(id);
    await api.injectSimulationFailure(id);
    await loadResources();
    setActionLoading(null);
  };

  const handleRecover = async (id: string) => {
    setActionLoading(id);
    await api.recoverSimulationResource(id);
    await loadResources();
    setActionLoading(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Cloud className="w-5 h-5 text-indigo-600" />
              Local Cloud Simulation Layer
            </h1>
            <Badge variant="indigo">LOCAL SIMULATION</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Simulates cloud topology (VPC 10.0.0.0/16, Compute, DB, Redis) without requiring external cloud credentials
          </p>
        </div>
        <ActionButton variant="outline" size="sm" icon={RefreshCw} onClick={loadResources} isLoading={loading}>
          Refresh Topology
        </ActionButton>
      </div>

      {/* Simulated Resources Grid */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Simulated Cloud Resources</h2>
          <span className="text-xs text-slate-400 font-mono">Count: {resources.length}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((r) => (
            <div key={r.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-white transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs font-mono">{r.name}</span>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-xs text-slate-600">{r.description || r.type}</div>
              <div className="text-[11px] text-slate-400 font-mono">ID: {r.id} • Region: local-sim-1</div>

              <div className="pt-2 flex items-center gap-2">
                {r.status === "AVAILABLE" || r.status === "HEALTHY" ? (
                  <ActionButton
                    variant="danger"
                    size="sm"
                    onClick={() => handleInject(r.id)}
                    isLoading={actionLoading === r.id}
                  >
                    Inject Failure
                  </ActionButton>
                ) : (
                  <ActionButton
                    variant="primary"
                    size="sm"
                    onClick={() => handleRecover(r.id)}
                    isLoading={actionLoading === r.id}
                  >
                    Recover Resource
                  </ActionButton>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
