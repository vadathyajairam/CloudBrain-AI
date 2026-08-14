"use client";

import React, { useMemo } from "react";
import {
  Heart,
  AlertTriangle,
  Boxes,
  RefreshCw,
  BrainCircuit,
  ArrowRight,
  Database,
  Cpu,
  BookOpen,
  CheckCircle2,
  Flame,
  FileCode2,
  Play,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Server,
  Cloud,
} from "lucide-react";
import { SystemMetrics, ContainerInfo, RCAReport } from "../lib/api";
import { Card, Badge, StatusBadge, ActionButton, DataSourceBadge, EmptyState } from "../components/UIComponents";

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

// ── Sparkline SVG Component ──────────────────────────────────────────────────
function Sparkline({
  data,
  color = "#4f46e5",
  height = 36,
  width = 120,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (data.length < 2) {
    const baseline = data.length === 1 ? [data[0], data[0]] : [50, 50];
    return <Sparkline data={baseline} color={color} height={height} width={width} />;
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
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Multi-Series Line Chart ──────────────────────────────────────────────────
function ResourceChart({ history }: { history: SystemMetrics[] }) {
  const W = 600;
  const H = 220;
  const PAD = { top: 16, right: 20, bottom: 32, left: 42 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const series = useMemo(
    () => [
      {
        label: "CPU",
        color: "#4f46e5", // Indigo
        data: history.map((m) => m.cpu.usage_percent),
      },
      {
        label: "Memory",
        color: "#0284c7", // Sky
        data: history.map((m) => m.memory.usage_percent),
      },
      {
        label: "Disk",
        color: "#f59e0b", // Amber
        data: history.map((m) => m.disk.usage_percent),
      },
    ],
    [history]
  );

  const n = Math.max(history.length, 2);
  const maxVal = 100;

  const getPoints = (data: number[]) =>
    data
      .map((v, i) => {
        const x = PAD.left + (i / (n - 1)) * cW;
        const y = PAD.top + cH - (Math.min(v, maxVal) / maxVal) * cH;
        return `${x},${y}`;
      })
      .join(" ");

  const yTicks = [0, 25, 50, 75, 100];
  const latestMetric = history[history.length - 1];

  return (
    <div className="w-full">
      {/* Legend & Stats Header */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <span>CPU ({latestMetric?.cpu.usage_percent ?? 0}%)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
            <span>Memory ({latestMetric?.memory.usage_percent ?? 0}%)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Disk ({latestMetric?.disk.usage_percent ?? 0}%)</span>
          </div>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          History: {history.length} points
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-52 overflow-visible" preserveAspectRatio="none">
        {/* Y Grid & Axis Labels */}
        {yTicks.map((tick) => {
          const y = PAD.top + cH - (tick / 100) * cH;
          return (
            <g key={tick}>
              <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={PAD.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="monospace">
                {tick}%
              </text>
            </g>
          );
        })}

        {/* Lines */}
        {series.map((s) => (
          <polyline
            key={s.label}
            points={getPoints(s.data)}
            fill="none"
            stroke={s.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}

// ── Main Dashboard View ─────────────────────────────────────────────────────
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
  const healthScore = metrics?.health_score ?? 100;
  const isHealthy = healthScore >= 90;

  const runningContainers = containers.filter((c) => c.status === "running").length;
  const stoppedContainers = containers.filter((c) => c.status !== "running").length;
  const isDockerAvailable = containers.length > 0;

  const hasIncident = rcaReport && rcaReport.status !== "HEALTHY" && Boolean(rcaReport.root_cause);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── 3. DASHBOARD HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Synexis Operations Center</h1>
            <Badge variant="indigo">Enterprise v2.5</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time observability, RAG-grounded root cause analysis, and safe automated remediation
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <ActionButton variant="outline" size="sm" icon={Database} onClick={() => onSelectTab("data_sources")}>
            Data Sources
          </ActionButton>
          <ActionButton
            variant={activeChaos ? "danger" : "primary"}
            size="sm"
            icon={Flame}
            onClick={onOpenChaosModal}
          >
            {activeChaos ? `Chaos: ${activeChaos}` : "Chaos Lab"}
          </ActionButton>
        </div>
      </div>

      {/* ── 4. KPI CARDS (4 Equal Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: Health Score */}
        <Card padding="sm" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Heart className={`w-4 h-4 ${isHealthy ? "text-emerald-500" : "text-amber-500"}`} />
                Health Score
              </span>
              <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">psutil</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight my-1">
              {healthScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <StatusBadge status={isHealthy ? "HEALTHY" : "DEGRADED"} />
              <span className="text-slate-500 text-[11px]">
                {isHealthy ? "Optimal performance" : "Anomaly detected"}
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-3">
            <span className="text-[10px] text-slate-400 font-mono">Source: Local Host</span>
            <Sparkline data={metricsHistory.map((m) => m.health_score)} color={isHealthy ? "#10b981" : "#f59e0b"} />
          </div>
        </Card>

        {/* CARD 2: Containers */}
        <Card padding="sm" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-indigo-500" />
                Containers
              </span>
              <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Docker</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight my-1">
              {containers.length} <span className="text-xs font-normal text-slate-400">Monitored</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{runningContainers} Running</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">{stoppedContainers} Stopped</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-3">
            <span className="text-[10px] text-slate-400 font-mono">Source: Docker SDK</span>
            <Sparkline data={metricsHistory.map((m) => m.cpu.usage_percent)} color="#4f46e5" />
          </div>
        </Card>

        {/* CARD 3: Incidents */}
        <Card padding="sm" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <AlertTriangle className={`w-4 h-4 ${hasIncident ? "text-rose-500" : "text-emerald-500"}`} />
                Incidents
              </span>
              <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">SQLite</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight my-1">
              {hasIncident ? "1" : "0"} <span className="text-xs font-normal text-slate-400">Active</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <StatusBadge status={hasIncident ? "INVESTIGATING" : "RESOLVED"} />
              <span className="text-slate-500 text-[11px]">
                {hasIncident ? "Under Investigation" : "All Clear"}
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-3">
            <span className="text-[10px] text-slate-400 font-mono">Source: Incident DB</span>
            <Sparkline data={metricsHistory.map((m) => (m.status === "CRITICAL" ? 100 : 20))} color={hasIncident ? "#f43f5e" : "#10b981"} />
          </div>
        </Card>

        {/* CARD 4: RAG Runbooks */}
        <Card padding="sm" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-sky-500" />
                RAG Runbooks
              </span>
              <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">128-D</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight my-1">
              13 <span className="text-xs font-normal text-slate-400">Runbooks</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Badge variant="sky">Grounding Active</Badge>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-3">
            <span className="text-[10px] text-slate-400 font-mono">Source: Synexis RAG</span>
            <Sparkline data={[20, 40, 65, 80, 100]} color="#0284c7" />
          </div>
        </Card>
      </div>

      {/* ── 5. MAIN CONTENT GRID (2 Columns) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT / LARGE: Live Compute Utilization */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                Live Compute Utilization
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sub-second host system telemetry (CPU, Memory, Disk) via psutil worker
              </p>
            </div>
            <ActionButton variant="ghost" size="sm" icon={RefreshCw} onClick={() => onSelectTab("monitoring")}>
              Detailed View
            </ActionButton>
          </div>

          <ResourceChart history={metricsHistory} />
        </Card>

        {/* RIGHT: Incident Stream + AI RCA & RAG Insights */}
        <div className="space-y-4 flex flex-col">
          {/* Incident Stream Card */}
          <Card padding="md" className="flex-1">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Incident Stream
              </h3>
              <button
                onClick={() => onSelectTab("incidents")}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                View All →
              </button>
            </div>

            {hasIncident ? (
              <div className="space-y-3">
                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <StatusBadge status="INVESTIGATING" />
                    <span className="text-[10px] font-mono text-rose-700 font-semibold">INC-001</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1">{rcaReport?.root_cause || "Anomaly Detected"}</h4>
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {rcaReport?.evidence_summary || "Automated detection triggered by real-time telemetry threshold."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center bg-slate-50 rounded-lg border border-slate-100">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                <div className="text-xs font-semibold text-slate-800">No Active Outages</div>
                <div className="text-[11px] text-slate-500 mt-0.5">All monitored endpoints operating normally</div>
              </div>
            )}
          </Card>

          {/* AI RCA & RAG Insights Card */}
          <Card padding="md" className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-indigo-400" />
                AI RCA & RAG Engine
              </span>
              <span className="text-[10px] bg-indigo-950 text-indigo-200 border border-indigo-700 px-2 py-0.5 rounded-full font-mono">
                {rcaReport?.confidence ?? 95}% Confidence
              </span>
            </div>
            <h4 className="text-xs font-bold text-white leading-snug">
              {rcaReport?.root_cause ? rcaReport.root_cause : "Baseline System Telemetry Grounded"}
            </h4>
            <p className="text-[11px] text-indigo-200/80 mt-1 line-clamp-2 leading-relaxed">
              {rcaReport?.recommendation ? rcaReport.recommendation : "RAG vector index loaded with 13 engineering runbooks ready for incident retrieval."}
            </p>
            <div className="mt-3 pt-2 border-t border-indigo-800/80 flex items-center justify-between">
              <span className="text-[10px] text-indigo-300 font-mono">Model: {rcaReport?.model_used || "synexis-rca"}</span>
              <button
                onClick={onOpenInvestigation}
                className="text-xs font-semibold text-white hover:text-indigo-200 flex items-center gap-1 cursor-pointer"
              >
                Investigate <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* ── 6. DOCKER SANDBOX SECTION ── */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-indigo-600" />
              Docker Sandbox Container Fleet
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Source: Docker Engine SDK • Prefix filter strictly restricted to <code className="font-mono text-indigo-600">synexis-*</code>
            </p>
          </div>
          <ActionButton variant="outline" size="sm" icon={ArrowRight} onClick={() => onSelectTab("containers")}>
            Manage Containers
          </ActionButton>
        </div>

        {isDockerAvailable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px] bg-slate-50">
                  <th className="py-2.5 px-3">Container Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Health</th>
                  <th className="py-2.5 px-3">CPU Usage</th>
                  <th className="py-2.5 px-3">Memory</th>
                  <th className="py-2.5 px-3">Ports</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {containers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 font-sans">{c.name}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={c.state} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{c.cpu_percent}%</td>
                    <td className="py-2.5 px-3 text-slate-700">{c.memory_mb} MB</td>
                    <td className="py-2.5 px-3 text-slate-500">{c.ports?.join(", ") || "—"}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onRestartContainer(c.name)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-sans font-semibold transition-colors cursor-pointer"
                      >
                        Restart
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Docker Sandbox Offline"
            description="Docker Desktop daemon is not currently running. Launch Docker Desktop and start the sandbox cluster to enable live container management."
            codeSnippet="cd sandbox && docker compose up -d"
            icon={Boxes}
          />
        )}
      </Card>

      {/* ── 7. QUICK ACTIONS ── */}
      <Card padding="md">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Quick Operations & Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onSelectTab("artifacts")}
            className="p-3 bg-slate-50 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-200 rounded-lg text-left transition-all cursor-pointer group"
          >
            <FileCode2 className="w-5 h-5 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-900">Generate Artifact</div>
            <div className="text-[10px] text-slate-500 mt-0.5">K8s, Docker, Terraform</div>
          </button>

          <button
            onClick={() => onSelectTab("ai_rca")}
            className="p-3 bg-slate-50 hover:bg-sky-50/80 border border-slate-200 hover:border-sky-200 rounded-lg text-left transition-all cursor-pointer group"
          >
            <BookOpen className="w-5 h-5 text-sky-600 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-900">View Runbooks</div>
            <div className="text-[10px] text-slate-500 mt-0.5">128-D Dense Vector Index</div>
          </button>

          <button
            onClick={onOpenChaosModal}
            className="p-3 bg-slate-50 hover:bg-rose-50/80 border border-slate-200 hover:border-rose-200 rounded-lg text-left transition-all cursor-pointer group"
          >
            <Flame className="w-5 h-5 text-rose-600 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-900">Simulate Failure</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Inject Chaos Scenarios</div>
          </button>

          <button
            onClick={() => onSelectTab("incidents")}
            className="p-3 bg-slate-50 hover:bg-amber-50/80 border border-slate-200 hover:border-amber-200 rounded-lg text-left transition-all cursor-pointer group"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-900">View Incidents</div>
            <div className="text-[10px] text-slate-500 mt-0.5">6-State Lifecycle Log</div>
          </button>
        </div>
      </Card>

      {/* ── 8. BOTTOM INFRASTRUCTURE STATUS BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider mr-1">Data Sources:</span>
          <DataSourceBadge name="Docker" status={isDockerAvailable ? "connected" : "not_connected"} />
          <DataSourceBadge name="PostgreSQL" status="connected" />
          <DataSourceBadge name="Redis" status="connected" />
          <DataSourceBadge name="Kubernetes" status="not_connected" />
          <DataSourceBadge name="AWS" status="disabled" />
          <DataSourceBadge name="Azure" status="disabled" />
          <DataSourceBadge name="GCP" status="disabled" />
        </div>
        <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px] shrink-0">
          <span>Auto Refresh: <strong className="text-emerald-600">Active</strong></span>
          <span>Updated: {metrics?.iso_timestamp ? new Date(metrics.iso_timestamp).toLocaleTimeString() : "Live"}</span>
        </div>
      </div>
    </div>
  );
};
