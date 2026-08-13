"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Server,
  Layers,
  Cpu,
  Bot,
  BookOpen,
  Cloud,
  ShieldCheck,
} from "lucide-react";
import { EnvironmentInfo, api } from "../lib/api";

const ENV_ICONS: Record<string, React.ElementType> = {
  local: Cpu,
  docker: Server,
  database: Database,
  ai_provider: Bot,
  rag: BookOpen,
  kubernetes: Layers,
  simulated_cloud: Cloud,
  aws: Cloud,
  azure: Cloud,
  gcp: Cloud,
};

export default function DataSourcesView() {
  const [environments, setEnvironments] = useState<EnvironmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>("");

  const fetchEnvironments = async () => {
    try {
      const data = await api.getEnvironments();
      setEnvironments(data.environments || []);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Error loading data sources:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvironments();
    const interval = setInterval(fetchEnvironments, 10000);
    return () => clearInterval(interval);
  }, []);

  const connectedCount = environments.filter((e) => e.connected).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 leading-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              Data Sources & Subsystem Connectivity
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              {connectedCount} of {environments.length} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent view of real data sources providing telemetry, logs, Docker state, RAG knowledge, and AI models
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              Checked: {lastRefresh}
            </span>
          )}
          <button
            onClick={fetchEnvironments}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>Refresh Probes</span>
          </button>
        </div>
      </div>

      {/* ── Provenance Architecture Card ── */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Synexis Data Provenance Guarantee
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Every number, chart point, and log entry in Synexis comes from an audited live source. Local telemetry is collected via native <code>psutil</code>, container fleet stats via the official Docker SDK, knowledge via the Synexis RAG vector store, and audit events via PostgreSQL/SQLite. Unconnected cloud environments are explicitly labeled as <strong>Not Connected</strong>.
        </p>
      </div>

      {/* ── Environments Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {environments.map((env) => {
          const Icon = ENV_ICONS[env.id] || Server;
          const isConnected = env.connected;
          const isConfigured = env.status !== "not_configured";

          return (
            <div
              key={env.id}
              className={`p-4 rounded-xl border bg-white shadow-sm flex flex-col justify-between space-y-3 transition-all ${
                isConnected
                  ? "border-emerald-200 ring-1 ring-emerald-100"
                  : isConfigured
                  ? "border-rose-200 ring-1 ring-rose-100"
                  : "border-slate-200 opacity-75"
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isConnected
                          ? "bg-emerald-50 text-emerald-600"
                          : isConfigured
                          ? "bg-rose-50 text-rose-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{env.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{env.source_library}</div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isConnected
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : isConfigured
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isConnected ? "bg-emerald-500" : isConfigured ? "bg-rose-500" : "bg-slate-400"
                      }`}
                    />
                    {isConnected ? "Connected" : isConfigured ? "Disconnected" : "Not Connected"}
                  </span>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 min-h-[50px] flex items-center">
                  {env.status_detail}
                </div>
              </div>

              {/* Data Provided Tags */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Telemetry Streams Provided:
                </div>
                <div className="flex flex-wrap gap-1">
                  {env.data_provided.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
