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
  X,
  LayoutList,
  LayoutGrid
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
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

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
    } catch (e: any) {
      alert(`Container action failed: ${e.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-600" />
            Docker & Container Infrastructure Cluster
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time container health telemetry, memory ceilings, port bindings, and lifecycle controls
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Table View"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Table</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Cards</span>
            </button>
          </div>

          <span className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700 font-semibold">
            {containers.filter((c) => c.status === "running").length} / {containers.length} Running
          </span>
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shadow-xs"
            title="Refresh containers"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Containers Content */}
      {containers.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-sm">
          <div className="text-4xl">🐳</div>
          <h3 className="text-base font-bold text-slate-800">Docker Engine Disconnected</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Docker Desktop is offline or no <code>synexis-*</code> sandbox containers were found. Start Docker Desktop and launch the sandbox cluster to begin live container tracking.
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
      ) : viewMode === "table" ? (
        /* ── Professional High-Density SRE Table ── */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Container</th>
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Health</th>
                  <th className="px-4 py-3">CPU</th>
                  <th className="px-4 py-3">Memory</th>
                  <th className="px-4 py-3 text-center">Restarts</th>
                  <th className="px-4 py-3">Uptime</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {containers.map((c) => {
                  const isRunning = c.status === "running";
                  const isHealthy = c.state === "healthy";
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? (isHealthy ? "bg-emerald-500" : "bg-rose-500") : "bg-slate-400"}`} />
                          <span className="font-bold text-slate-900 font-sans">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px] truncate max-w-[140px]">{c.image}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          isRunning ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          isHealthy ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : !isRunning ? "bg-slate-100 text-slate-500" : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}>
                          {c.state?.toUpperCase() || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${c.cpu_percent > 80 ? "text-rose-600" : c.cpu_percent > 50 ? "text-amber-600" : "text-slate-800"}`}>
                          {c.cpu_percent}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {c.memory_mb} <span className="text-slate-400">/ {c.memory_limit_mb} MB</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${c.restart_count > 2 ? "bg-rose-100 text-rose-700" : "text-slate-600"}`}>
                          {c.restart_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">{c.uptime}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleInspect(c)}
                            className="px-2 py-1 text-[11px] text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-200 font-sans font-medium"
                          >
                            Inspect
                          </button>
                          {isRunning ? (
                            <>
                              <button
                                onClick={() => handleAction(c.id, "restart")}
                                disabled={actionLoadingId === `${c.id}-restart`}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-sans font-medium disabled:opacity-50"
                              >
                                {actionLoadingId === `${c.id}-restart` ? "..." : "Restart"}
                              </button>
                              <button
                                onClick={() => handleAction(c.id, "stop")}
                                disabled={actionLoadingId === `${c.id}-stop`}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-sans font-medium disabled:opacity-50"
                              >
                                Stop
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleAction(c.id, "start")}
                              disabled={actionLoadingId === `${c.id}-start`}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-sans font-semibold disabled:opacity-50"
                            >
                              Start
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Containers Cards Grid ── */
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
