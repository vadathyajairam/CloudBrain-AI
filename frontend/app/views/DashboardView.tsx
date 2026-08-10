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
    // Fallback wave
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
      {
        label: "Net In",
        color: "#8b5cf6",
        data: history.map((m) => Math.min((m.network.download_kbps / 10) * 100, 100)),
      },
      {
        label: "Net Out",
        color: "#06b6d4",
        data: history.map((m) => Math.min((m.network.upload_kbps / 10) * 100, 100)),
      },
    ],
    [history]
  );

  const getPath = (data: number[]) => {
    if (data.length < 2) return "";
    return data
      .map((v, i) => {
        const x = PAD.left + (i / (data.length - 1)) * cW;
        const y = PAD.top + (1 - v / 100) * cH;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const yLines = [0, 25, 50, 75, 100];
  const n = history.length;
  const xIdxs = n > 1 ? [0, Math.round(n * 0.25), Math.round(n * 0.5), Math.round(n * 0.75), n - 1] : [];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {/* Y-grid */}
      {yLines.map((y) => {
        const yp = PAD.top + (1 - y / 100) * cH;
        return (
          <g key={y}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yp}
              y2={yp}
              stroke={y === 0 ? "#cbd5e1" : "#e2e8f0"}
              strokeWidth="1"
              strokeDasharray={y === 0 ? "" : "3 3"}
            />
            <text
              x={PAD.left - 6}
              y={yp + 3.5}
              textAnchor="end"
              fontSize="9"
              fill="#94a3b8"
            >
              {y}%
            </text>
          </g>
        );
      })}

      {/* X labels */}
      {xIdxs.map((idx, i) => {
        const x = PAD.left + (idx / Math.max(n - 1, 1)) * cW;
        return (
          <text
            key={i}
            x={x}
            y={H - 6}
            textAnchor="middle"
            fontSize="9"
            fill="#94a3b8"
          >
            {history[idx]?.timestamp || ""}
          </text>
        );
      })}

      {/* Lines */}
      {series.map((s) => (
        <path
          key={s.label}
          d={getPath(s.data)}
          fill="none"
          stroke={s.color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

// ── Severity helpers ────────────────────────────────────
function sevColors(sev: string) {
  if (sev === "CRITICAL" || sev === "HIGH")
    return { dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700 border-rose-200", label: "High" };
  if (sev === "MEDIUM")
    return { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200", label: "Medium" };
  return { dot: "bg-slate-400", badge: "bg-slate-50 text-slate-600 border-slate-200", label: "Low" };
}

// ── Infrastructure Node ──────────────────────────────────
function InfraNode({
  label,
  sub,
  emoji,
  healthy = true,
}: {
  label: string;
  sub: string;
  emoji: string;
  healthy?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 shadow-xs">
      <span className="text-base leading-none">{emoji}</span>
      <div>
        <div className="text-[11px] font-semibold text-slate-700 leading-tight">{label}</div>
        <div className={`text-[10px] leading-tight ${healthy ? "text-emerald-600" : "text-rose-500"}`}>
          {healthy ? "⬤" : "⬤"} {sub}
        </div>
      </div>
    </div>
  );
}

// ── Main View ───────────────────────────────────────────
export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  metricsHistory,
  containers,
  rcaReport,
  activeChaos,
  onOpenInvestigation,
  onOpenChaosModal,
  onSelectTab,
  onRestartContainer,
}) => {
  const isIncidentActive = rcaReport && rcaReport.status !== "HEALTHY";
  const healthyCount = containers.filter((c) => c.state === "healthy").length;
  const degradedCount = containers.filter((c) => c.state !== "healthy").length;
  const runningCount = containers.filter((c) => c.status === "running").length;
  const stoppedCount = containers.filter((c) => c.status !== "running").length;

  // Sparkline histories
  const cpuHist = metricsHistory.map((m) => m.cpu.usage_percent);
  const memHist = metricsHistory.map((m) => m.memory.usage_percent);
  const diskHist = metricsHistory.map((m) => m.disk.usage_percent);
  const netHist = metricsHistory.map((m) => m.network.download_kbps);

  // Build top-services from live container data
  const containerMap = Object.fromEntries(containers.map((c) => [c.id, c]));
  const topServices = [
    { name: "api-gateway", cid: "c-backend", requests: "1.2k/s" },
    { name: "user-service", cid: "c-frontend", requests: "856/s" },
    { name: "order-service", cid: "c-database", requests: "2.4k/s" },
    { name: "payment-service", cid: "c-redis", requests: "320/s" },
    { name: "notification-service", cid: "c-worker", requests: "120/s" },
  ].map((s) => {
    const c = containerMap[s.cid];
    return {
      name: s.name,
      cpu: c ? Math.round(c.cpu_percent) : 0,
      memory: c ? `${c.memory_mb} MB` : "—",
      status: c?.state === "healthy" ? "Healthy" : "Degraded",
      requests: s.requests,
    };
  });

  // Recent incidents list
  const recentIncidents = [
    ...(isIncidentActive
      ? [
          {
            title: rcaReport?.title || "Active Incident",
            node: `AI detected • ${rcaReport?.detected_issue?.slice(0, 48) || ""}`,
            time: "now",
            sev: rcaReport?.severity || "HIGH",
          },
        ]
      : []),
    {
      title: "High CPU usage on node worker-02",
      node: "worker-02 • High CPU usage detected above 90%",
      time: "2m ago",
      sev: "HIGH",
    },
    {
      title: "Database response time degraded",
      node: "postgres-prod • Response time > 1s",
      time: "15m ago",
      sev: "MEDIUM",
    },
    {
      title: "Container restart loop detected",
      node: "user-service • Restarting frequently",
      time: "47m ago",
      sev: "LOW",
    },
  ].slice(0, 3);

  // AI Insights bullets
  const insights = [
    `CloudBrain AI analyzed ${metricsHistory.length * 48 + 200} events in the last 15 minutes.`,
    isIncidentActive
      ? rcaReport?.detected_issue?.slice(0, 60) + "..."
      : "No anomalous behavior detected in the cluster.",
    "Database performance is within normal range.",
    isIncidentActive
      ? "System resources are degraded. Investigate the active incident."
      : "Memory usage is trending higher on worker-02.",
  ];

  return (
    <div className="p-6 space-y-5 min-h-full bg-slate-50">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time overview of your infrastructure and applications
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs font-medium">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
              <path d="M16 2v4M8 2v4M3 10h18" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Last 15 minutes
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-semibold shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            Add Widget
          </button>
          <button className="p-2 text-slate-500 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Health */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Heart className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-xs font-medium text-slate-500">Overall Health</span>
          </div>
          <div
            className={`text-2xl font-bold mb-1 ${
              metrics?.status === "HEALTHY"
                ? "text-emerald-500"
                : metrics?.status === "DEGRADED"
                ? "text-amber-500"
                : "text-rose-500"
            }`}
          >
            {metrics?.status === "HEALTHY"
              ? "Healthy"
              : metrics?.status === "DEGRADED"
              ? "Degraded"
              : metrics
              ? "Critical"
              : "Loading…"}
          </div>
          <div className="text-[11px] text-slate-400 mb-3">
            {isIncidentActive ? "Active incident detected" : "No critical issues"}
          </div>
          <Sparkline
            data={cpuHist.length > 0 ? cpuHist.map((v) => 100 - v) : []}
            color="#10b981"
          />
        </div>

        {/* Services */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-xs font-medium text-slate-500">Services</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">{containers.length}</div>
          <div className="text-[11px] text-slate-400 mb-3">
            {healthyCount} Healthy •{" "}
            <span className={degradedCount > 0 ? "text-amber-500" : ""}>{degradedCount} Degraded</span>
          </div>
          <Sparkline
            data={containers.length > 0 ? new Array(10).fill(containers.length) : []}
            color="#3b82f6"
          />
        </div>

        {/* Incidents */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-xs font-medium text-slate-500">Incidents</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">
            {isIncidentActive ? 1 : 0}
          </div>
          <div className="text-[11px] text-slate-400 mb-3">
            {isIncidentActive ? (
              <span className="text-rose-500">1 Open • 1 In Progress</span>
            ) : (
              "0 Open • All Resolved"
            )}
          </div>
          <Sparkline
            data={[0, 0, 1, 0, 2, 1, 0, 1, 0, isIncidentActive ? 1 : 0]}
            color="#f59e0b"
          />
        </div>

        {/* Containers */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Box className="w-4 h-4 text-violet-500" />
            </div>
            <span className="text-xs font-medium text-slate-500">Containers</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">{runningCount}</div>
          <div className="text-[11px] text-slate-400 mb-3">
            {runningCount} Running •{" "}
            <span className={stoppedCount > 0 ? "text-rose-500" : ""}>{stoppedCount} Stopped</span>
          </div>
          <Sparkline
            data={
              metricsHistory.length > 0
                ? metricsHistory.map(() => runningCount)
                : [runningCount]
            }
            color="#8b5cf6"
          />
        </div>
      </div>

      {/* ── Middle Section: Chart + Right Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Resource Utilization Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Resource Utilization</h3>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <select className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 shadow-xs">
              <option>All Nodes</option>
              <option>worker-01</option>
              <option>worker-02</option>
            </select>
          </div>

          <div className="w-full">
            {metricsHistory.length > 1 ? (
              <ResourceChart history={metricsHistory} />
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                Collecting telemetry data…
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 pt-3 border-t border-slate-100">
            {[
              { label: "CPU", color: "#10b981", value: `${metrics?.cpu.usage_percent ?? 0}%` },
              { label: "Memory", color: "#3b82f6", value: `${metrics?.memory.usage_percent ?? 0}%` },
              { label: "Disk", color: "#f59e0b", value: `${metrics?.disk.usage_percent ?? 0}%` },
              {
                label: "Network In",
                color: "#8b5cf6",
                value: `${metrics?.network.download_kbps ?? 0} KB/s`,
              },
              {
                label: "Network Out",
                color: "#06b6d4",
                value: `${metrics?.network.upload_kbps ?? 0} KB/s`,
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
              <h3 className="text-sm font-semibold text-slate-800">Recent Incidents</h3>
              <button
                onClick={() => onSelectTab("incidents")}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                View all
              </button>
            </div>
            <div className="space-y-3.5">
              {recentIncidents.map((inc, idx) => {
                const c = sevColors(inc.sev);
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 cursor-pointer group"
                    onClick={() => isIncidentActive && idx === 0 ? onOpenInvestigation() : undefined}
                  >
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${c.dot}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                        {inc.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {inc.node}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] text-slate-400 mb-1">{inc.time}</div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${c.badge}`}
                      >
                        {c.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">AI Insights</h3>
              <button
                onClick={() => onSelectTab("ai_rca")}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                View all
              </button>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <BrainCircuit className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <span className="text-[11px] text-slate-600 leading-relaxed">{insights[0]}</span>
              </div>
              <div className="space-y-1.5 mt-1">
                {insights.slice(1).map((msg, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                        idx === 0 && isIncidentActive ? "bg-amber-400" : "bg-emerald-500"
                      }`}
                    />
                    <span className="text-[11px] text-slate-600 leading-relaxed">{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Top Services + Infra Map ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Services Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Top Services</h3>
            <button
              onClick={() => onSelectTab("containers")}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors flex items-center gap-1"
            >
              View all services <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Service", "Status", "CPU", "Memory", "Requests"].map((h) => (
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
                {topServices.map((svc) => {
                  const isHealthy = svc.status === "Healthy";
                  const cpuPct = Math.min(svc.cpu, 100);
                  return (
                    <tr key={svc.name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{svc.name}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`flex items-center gap-1.5 font-semibold text-[11px] ${
                            isHealthy ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isHealthy ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {svc.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                cpuPct > 60 ? "bg-amber-400" : "bg-indigo-400"
                              }`}
                              style={{ width: `${cpuPct}%` }}
                            />
                          </div>
                          <span className="text-slate-600 tabular-nums">{svc.cpu}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full w-1/3" />
                          </div>
                          <span className="text-slate-600 tabular-nums">{svc.memory}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600 tabular-nums">{svc.requests}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Infrastructure Map */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Infrastructure Map</h3>
            <button className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
              View full map
            </button>
          </div>

          <div className="flex flex-col items-center gap-0">
            {/* Load Balancer */}
            <InfraNode label="Load Balancer" sub="Healthy" emoji="⚖️" />
            {/* Connector */}
            <div className="w-px h-5 bg-slate-200" />

            {/* Tier 2 */}
            <div className="flex items-start gap-2">
              <div className="flex flex-col items-center">
                <div className="w-px h-3 bg-slate-200" />
                <InfraNode label="API Gateway" sub="24 Pods" emoji="🌐" />
              </div>
              <div className="flex flex-col items-center">
                <div className="w-px h-3 bg-slate-200" />
                <InfraNode label="Application" sub="24 Pods" emoji="⚙️" />
              </div>
              <div className="flex flex-col items-center">
                <div className="w-px h-3 bg-slate-200" />
                <InfraNode label="Database" sub="8 Healthy" emoji="🗄️" />
              </div>
            </div>

            {/* Connector */}
            <div className="w-px h-5 bg-slate-200" />

            {/* Tier 3 */}
            <div className="flex items-start gap-2">
              <div className="flex flex-col items-center">
                <div className="w-px h-3 bg-slate-200" />
                <InfraNode label="Redis" sub="8 Healthy" emoji="⚡" />
              </div>
              <div className="flex flex-col items-center">
                <div className="w-px h-3 bg-slate-200" />
                <InfraNode label="Kafka" sub="8 Healthy" emoji="📨" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
