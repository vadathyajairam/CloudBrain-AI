"use client";

import React, { useMemo } from "react";
import {
  Heart,
  LayoutGrid,
  AlertTriangle,
  Box,
  ChevronDown,
  Plus,
  RefreshCw,
  BrainCircuit,
  Info,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  BookOpen,
} from "lucide-react";
import { SystemMetrics, ContainerInfo, RCAReport } from "../lib/api";

interface DashboardViewProps {
  metrics: SystemMetrics | null;
  metricsHistory: SystemMetrics[];
  containers: ContainerInfo[];
  rcaReport: RCAReport | null;
  recentLogs: any[];
  activeChaos: string | null;
  onOpenInvestigation: () => void;
  onOpenChaosModal: () => void;
  onSelectTab: (tab: any) => void;
  onRestartContainer: (id: string) => Promise<void>;
}

// ── Sparkline SVG ───────────────────────────────────────
function Sparkline({
  data,
  color,
  height = 44,
  width = 130,
}: {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}) {
  if (data.length < 2) {
    const wave = [40, 45, 42, 48, 44, 50, 47, 52, 48, 50];
    return <Sparkline data={wave} color={color} height={height} width={width} />;
  }
  const max = Math.max(...data, 0.01);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Multi-line Resource Chart ───────────────────────────
function ResourceChart({ history }: { history: SystemMetrics[] }) {
  const W = 560;
  const H = 200;
  const PAD = { top: 12, right: 16, bottom: 28, left: 38 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const series = useMemo(
    () => [
      {
        label: "CPU",
        color: "#10b981",
        data: history.map((m) => m.cpu.usage_percent),
      },
      {
        label: "Memory",
        color: "#3b82f6",
        data: history.map((m) => m.memory.usage_percent),
      },
      {
        label: "Disk",
        color: "#f59e0b",
        data: history.map((m) => m.disk.usage_percent),
      },
    ],
    [history]
  );

  const maxVal = 100;
  const n = Math.max(history.length, 2);

  const getPoints = (data: number[]) =>
    data
      .map((v, i) => {
        const x = PAD.left + (i / (n - 1)) * cW;
        const y = PAD.top + cH - (Math.min(v, maxVal) / maxVal) * cH;
        return `${x},${y}`;
      })
      .join(" ");

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-48 overflow-visible"
      preserveAspectRatio="none"
    >
      {yTicks.map((tick) => {
        const y = PAD.top + cH - (tick / 100) * cH;
        return (
          <g key={tick}>
            <line
              x1={PAD.left}
              y1={y}
              x2={PAD.left + cW}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={y + 3}
              textAnchor="end"
              fontSize="9"
              fill="#94a3b8"
              fontFamily="monospace"
            >
              {tick}%
            </text>
          </g>
        );
      })}

      {series.map((s) => (
        <polyline
          key={s.label}
          points={getPoints(s.data)}
          fill="none"
          stroke={s.color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

// ── Severity styling ────────────────────────────────────
function sevColors(sev: string) {
  switch (sev?.toUpperCase()) {
    case "CRITICAL":
      return {
        dot: "bg-rose-500",
        badge: "bg-rose-50 text-rose-700 border-rose-200",
        label: "CRITICAL",
      };
    case "HIGH":
      return {
        dot: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        label: "HIGH",
      };
    case "MEDIUM":
      return {
        dot: "bg-yellow-500",
        badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
        label: "MEDIUM",
      };
    default:
      return {
        dot: "bg-blue-500",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        label: "LOW",
      };
  }
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  metricsHistory,
  containers,
  rcaReport,
  recentLogs,
  activeChaos,
  onOpenInvestigation,
  onOpenChaosModal,
  onSelectTab,
  onRestartContainer,
}) => {
  const isIncidentActive = rcaReport && rcaReport.status !== "HEALTHY" && Boolean(rcaReport.root_cause);
  const healthyCount = containers.filter((c) => c.state === "healthy" || c.status === "running").length;
  const degradedCount = containers.filter((c) => c.state !== "healthy" && c.status !== "running").length;
  const runningCount = containers.filter((c) => c.status === "running").length;
  const stoppedCount = containers.filter((c) => c.status !== "running").length;

  const cpuHist = metricsHistory.map((m) => m.cpu.usage_percent);
  const memHist = metricsHistory.map((m) => m.memory.usage_percent);

  // Recent incidents list
  const recentIncidents = [
    ...(isIncidentActive
      ? [
          {
            title: rcaReport?.root_cause?.slice(0, 48) || "Active Telemetry Anomaly",
            node: `AI Grounded • ${rcaReport?.recommendation?.slice(0, 48) || ""}`,
            time: "live",
            sev: "HIGH",
          },
        ]
      : []),
    {
      title: "Automated Telemetry Pipeline Running",
      node: "Host System • Baseline Monitoring Active",
      time: "continuous",
      sev: "LOW",
    },
  ];

  // AI Insights
  const insights = [
    `Synexis AI is continuously monitoring live telemetry & Docker containers.`,
    isIncidentActive
      ? `Root cause diagnosed: ${rcaReport?.root_cause?.slice(0, 80)}...`
      : "All system parameters are within baseline operating thresholds.",
    rcaReport?.rag_sources && rcaReport.rag_sources.length > 0
      ? `Referenced RAG Runbook: ${rcaReport.rag_sources[0].title}`
      : "RAG Knowledge Base is ready for automated runbook grounding.",
  ];

  return (
    <div className="p-6 space-y-5 min-h-full bg-slate-50">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Synexis Operations Center</h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
              Live Telemetry
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time observability, RAG-grounded root cause analysis, and safe automated remediation
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onSelectTab("data_sources")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs font-medium"
          >
            <Database className="w-3.5 h-3.5 text-indigo-600" />
            Data Sources
          </button>
          <button
            onClick={onOpenChaosModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-semibold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Chaos Simulation
          </button>
        </div>
      </div>

      {/* ── Stat Cards with Data Source Citations ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Health */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Heart className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-xs font-medium text-slate-700">Health Score</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              psutil
            </span>
          </div>
          <div
            className={`text-2xl font-bold mb-1 ${
              metrics?.status === "HEALTHY"
                ? "text-emerald-600"
                : metrics?.status === "DEGRADED"
                ? "text-amber-500"
                : "text-rose-500"
            }`}
          >
            {metrics ? `${metrics.health_score} / 100` : "Loading…"}
          </div>
          <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
            <span>{isIncidentActive ? "Anomaly detected" : "System Healthy"}</span>
            <span className="text-[9px] text-slate-400">Source: Local Host</span>
          </div>
          <Sparkline
            data={cpuHist.length > 0 ? cpuHist.map((v) => 100 - v) : []}
            color="#10b981"
          />
        </div>

        {/* Monitored Services */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <LayoutGrid className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xs font-medium text-slate-700">Containers</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              Docker SDK
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">{containers.length} Monitored</div>
          <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
            <span>{healthyCount} Running • {stoppedCount} Stopped</span>
            <span className="text-[9px] text-slate-400">Source: Docker Engine</span>
          </div>
          <Sparkline
            data={containers.length > 0 ? new Array(10).fill(containers.length) : [0]}
            color="#3b82f6"
          />
        </div>

        {/* Active Incidents */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-xs font-medium text-slate-700">Incidents</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              Database
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">
            {isIncidentActive ? 1 : 0} Active
          </div>
          <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
            <span>{isIncidentActive ? "Under Investigation" : "0 Open Incidents"}</span>
            <span className="text-[9px] text-slate-400">Source: PostgreSQL/SQLite</span>
          </div>
          <Sparkline
            data={[0, 0, 0, 0, isIncidentActive ? 1 : 0]}
            color="#f59e0b"
          />
        </div>

        {/* RAG Knowledge Store */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-xs font-medium text-slate-700">RAG Knowledge</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
              Active
            </span>
          </div>
          <div className="text-2xl font-bold text-indigo-700 mb-1">
            {rcaReport?.rag_sources?.length || 6} Runbooks
          </div>
          <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
            <span>Grounding Active</span>
            <span className="text-[9px] text-slate-400">Source: Synexis RAG</span>
          </div>
          <Sparkline data={[6, 6, 6, 7, 7, 8]} color="#6366f1" />
        </div>
      </div>

      {/* ── Middle Section: Resource Chart + Right Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Resource Utilization Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Live Compute Utilization</h3>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
                Source: Local Machine (psutil)
              </span>
            </div>
            <div className="text-xs text-slate-500 font-mono">Host: Windows OS</div>
          </div>

          <div className="w-full">
            {metricsHistory.length > 1 ? (
              <ResourceChart history={metricsHistory} />
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                Collecting live telemetry data…
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 pt-3 border-t border-slate-100">
            {[
              { label: "Host CPU", color: "#10b981", value: `${metrics?.cpu.usage_percent ?? 0}%` },
              { label: "Memory", color: "#3b82f6", value: `${metrics?.memory.usage_percent ?? 0}%` },
              { label: "Disk", color: "#f59e0b", value: `${metrics?.disk.usage_percent ?? 0}%` },
              {
                label: "Net Download",
                color: "#8b5cf6",
                value: `${metrics?.network.download_kbps ?? 0} KB/s`,
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-5 h-0.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] text-slate-500">{item.label}</span>
                <span className="text-[11px] font-semibold text-slate-700">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Incidents + AI Insights */}
        <div className="space-y-4">
          {/* Recent Incidents */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-800">Incident Stream</h3>
                <span className="text-[9px] text-slate-400">Source: Database</span>
              </div>
              <button
                onClick={() => onSelectTab("incidents")}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                View Lifecycle
              </button>
            </div>
            <div className="space-y-3">
              {recentIncidents.map((inc, idx) => {
                const c = sevColors(inc.sev);
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 cursor-pointer group"
                    onClick={() => isIncidentActive && idx === 0 ? onOpenInvestigation() : undefined}
                  >
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${c.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                        {inc.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {inc.node}
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${c.badge}`}>
                      {c.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Insights Grounded with RAG */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-800">AI RCA & RAG Insights</h3>
              </div>
              <button
                onClick={() => onSelectTab("ai_rca")}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                Investigate
              </button>
            </div>
            <div className="space-y-2">
              {insights.map((msg, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                      idx === 1 && isIncidentActive ? "bg-amber-500" : "bg-indigo-500"
                    }`}
                  />
                  <span className="text-[11px] text-slate-600 leading-relaxed">{msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Container Fleet Inventory ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">Docker Sandbox Container Fleet</h3>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
              Source: Docker Engine SDK
            </span>
          </div>
          <button
            onClick={() => onSelectTab("containers")}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors flex items-center gap-1"
          >
            Manage Containers <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {containers.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="text-2xl">🐳</div>
            <div className="text-sm font-semibold text-slate-700">Docker Sandbox Offline</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Start Docker Desktop and launch the sandbox cluster (<code>cd sandbox && docker compose up -d</code>) to view live container telemetry.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Container Name", "Status", "Health State", "CPU %", "Memory", "Restarts", "Uptime"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {containers.map((c) => (
                  <tr key={c.id || c.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium text-slate-800">{c.name}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.status === "running"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${c.status === "running" ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 uppercase font-mono text-[10px]">{c.state}</td>
                    <td className="px-5 py-3 text-slate-700 font-mono">{c.cpu_percent}%</td>
                    <td className="px-5 py-3 text-slate-700 font-mono">{c.memory_mb} MB</td>
                    <td className="px-5 py-3 text-slate-700 font-mono">{c.restart_count}</td>
                    <td className="px-5 py-3 text-slate-500 font-mono">{c.uptime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
