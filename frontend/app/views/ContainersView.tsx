"use client";

import React, { useState, useEffect } from "react";
import { 
  Boxes, 
  RefreshCw, 
  Power, 
  Play, 
  Terminal, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  Server,
  FileText,
  X
} from "lucide-react";
import { ContainerInfo, LogEntry, api } from "../lib/api";

interface ContainersViewProps {
  containers: ContainerInfo[];
  onRefresh: () => Promise<void>;
}

export const ContainersView: React.FC<ContainersViewProps> = ({ containers, onRefresh }) => {
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<ContainerInfo | null>(null);
  const [containerLogs, setContainerLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchContainerLogs = async (c: ContainerInfo) => {
    setLogsLoading(true);
    try {
      let serviceKey = "backend";
      if (c.name.includes("frontend") || c.name.includes("nextjs")) serviceKey = "frontend";
      else if (c.name.includes("postgres") || c.name.includes("database")) serviceKey = "database";
      else if (c.name.includes("redis")) serviceKey = "redis";
      else if (c.name.includes("worker") || c.name.includes("celery")) serviceKey = "worker";

      const res = await api.getLogs({ service: serviceKey, limit: 30 });
      if (res.logs) {
        setContainerLogs(res.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleInspect = (c: ContainerInfo) => {
    setSelectedContainer(c);
    fetchContainerLogs(c);
  };

  const handleAction = async (id: string, action: "restart" | "stop" | "start") => {
    setActionLoadingId(`${id}-${action}`);
    try {
      if (action === "restart") await api.restartContainer(id);
      else if (action === "stop") await api.stopContainer(id);
      else if (action === "start") await api.startContainer(id);
      await onRefresh();
      if (selectedContainer && selectedContainer.id === id) {
        const updated = containers.find((item) => item.id === id);
        if (updated) {
          setSelectedContainer(updated);
          fetchContainerLogs(updated);
        }
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-cyan-400" />
            Docker & Container Infrastructure Cluster
          </h2>
          <p className="text-xs text-slate-400">
            Real-time container health telemetry, memory ceilings, port bindings, and lifecycle controls
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-indigo-300">
            {containers.filter((c) => c.status === "running").length} / {containers.length} Running
          </span>
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Containers Grid */}
      {containers.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-sm">
          <div className="text-4xl">🐳</div>
          <h3 className="text-base font-bold text-slate-800">Docker Engine Disconnected</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Docker Desktop is offline or no <code>synexis-*</code> / <code>cloudbrain-*</code> sandbox containers were found. Start Docker Desktop and launch the sandbox cluster to begin live container tracking.
          </p>
          <div className="pt-2">
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Docker Probe</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {containers.map((c) => {
            const isRunning = c.status === "running";
            const isHealthy = c.state === "healthy";

          return (
            <div
              key={c.id}
              className={`p-5 rounded-2xl border backdrop-blur-xl transition-all flex flex-col justify-between ${
                !isRunning
                  ? "bg-slate-950/80 border-slate-800 opacity-75"
                  : !isHealthy
                  ? "bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-950/20"
                  : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div>
                {/* Top status */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-3 h-3 rounded-full ${
                      !isRunning
                        ? "bg-slate-600"
                        : isHealthy
                        ? "bg-emerald-400 shadow-sm shadow-emerald-400/60"
                        : "bg-rose-500 animate-pulse"
                    }`} />
                    <h3 className="text-sm font-bold text-white truncate max-w-[160px]">
                      {c.name}
                    </h3>
                  </div>

                  <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded uppercase ${
                    !isRunning
                      ? "bg-slate-800 text-slate-400"
                      : isHealthy
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : "bg-rose-950 text-rose-300 border border-rose-800"
                  }`}>
                    {c.state}
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-xs">
                  <p className="text-slate-400 font-mono text-[11px] truncate">
                    Image: <strong className="text-slate-300">{c.image}</strong>
                  </p>
                  <p className="text-slate-500 font-mono text-[10px]">
                    Uptime: {c.uptime} • Restarts: {c.restart_count}
                  </p>
                  {c.ports.length > 0 && (
                    <div className="flex items-center space-x-1 text-[10px] font-mono text-cyan-400 pt-0.5">
                      <span>Ports:</span>
                      {c.ports.map((p, i) => (
                        <span key={i} className="bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resource Gauges */}
                <div className="mt-4 space-y-2 pt-3 border-t border-slate-800/80">
                  {/* CPU */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>CPU Usage</span>
                      <span className="text-white font-bold">{c.cpu_percent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          c.cpu_percent > 80 ? "bg-rose-500" : c.cpu_percent > 50 ? "bg-amber-500" : "bg-cyan-500"
                        }`}
                        style={{ width: `${Math.min(100, c.cpu_percent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Memory */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>Memory</span>
                      <span className="text-white font-bold">{c.memory_mb} / {c.memory_limit_mb} MB</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (c.memory_mb / c.memory_limit_mb) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleInspect(c)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium font-mono flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  <span>Inspect & Logs</span>
                </button>

                <div className="flex items-center space-x-1.5">
                  {isRunning ? (
                    <>
                      <button
                        onClick={() => handleAction(c.id, "restart")}
                        disabled={actionLoadingId === `${c.id}-restart`}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${actionLoadingId === `${c.id}-restart` ? "animate-spin" : ""}`} />
                        <span>Restart</span>
                      </button>
                      <button
                        onClick={() => handleAction(c.id, "stop")}
                        disabled={actionLoadingId === `${c.id}-stop`}
                        className="flex items-center space-x-1 px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-[10px] font-mono transition-colors"
                      >
                        <Power className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleAction(c.id, "start")}
                      disabled={actionLoadingId === `${c.id}-start`}
                      className="flex items-center space-x-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono transition-colors font-semibold"
                    >
                      <Play className="w-3 h-3" />
                      <span>Start</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Inspect Container Drawer/Modal with Live Logs */}
      {selectedContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-4 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-400">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Container Details: {selectedContainer.name}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    {selectedContainer.image} • {selectedContainer.id}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedContainer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 text-xs font-mono pr-1">
              {/* Health check & status */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block font-bold">Health Probe</span>
                  <span className="text-emerald-400 font-semibold">{selectedContainer.healthcheck}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block font-bold">Uptime & Restarts</span>
                  <span className="text-slate-200">{selectedContainer.uptime} ({selectedContainer.restart_count} restarts)</span>
                </div>
              </div>

              {/* Environment Variables */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-slate-400 block font-bold">Environment Configuration:</span>
                {Object.entries(selectedContainer.env).map(([k, v]) => (
                  <div key={k} className="text-slate-300 text-[11px]">
                    <span className="text-cyan-400">{k}</span> = {v}
                  </div>
                ))}
              </div>

              {/* Container Logs */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    Container Live Output Stream ({containerLogs.length} lines)
                  </span>
                  <button
                    onClick={() => fetchContainerLogs(selectedContainer)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${logsLoading ? "animate-spin" : ""}`} />
                    <span>Refresh Logs</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-black/90 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto space-y-1 border border-slate-800">
                  {containerLogs.length === 0 ? (
                    <div className="text-slate-500 text-center py-4">No recent output logs for this container.</div>
                  ) : (
                    containerLogs.map((l) => (
                      <div key={l.id} className="leading-relaxed">
                        <span className="text-slate-500">[{l.timestamp}]</span>{" "}
                        <span className={l.level === "ERROR" ? "text-rose-400 font-bold" : l.level === "WARN" ? "text-amber-400" : "text-emerald-400"}>
                          {l.level}
                        </span>{" "}
                        <span>{l.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={() => handleAction(selectedContainer.id, "restart")}
                disabled={actionLoadingId === `${selectedContainer.id}-restart`}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
              >
                Restart Container
              </button>

              <button
                onClick={() => setSelectedContainer(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
