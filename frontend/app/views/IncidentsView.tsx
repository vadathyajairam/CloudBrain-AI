"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowRight,
  Activity,
  Layers,
} from "lucide-react";
import { IncidentItem, api } from "../lib/api";

interface Evidence {
  type: string;
  source: string;
  detail: string;
  collected_at?: string;
}

interface IncidentStats {
  total: number;
  active: number;
  critical_active: number;
  resolved_today: number;
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    CRITICAL: "bg-rose-50 text-rose-700 border-rose-200",
    HIGH: "bg-amber-50 text-amber-700 border-amber-200",
    MEDIUM: "bg-yellow-50 text-yellow-800 border-yellow-200",
    LOW: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border font-mono ${styles[severity] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DETECTED: "bg-rose-50 text-rose-700 border-rose-200",
    ACKNOWLEDGED: "bg-amber-50 text-amber-700 border-amber-200",
    INVESTIGATING: "bg-indigo-50 text-indigo-700 border-indigo-200",
    REMEDIATING: "bg-purple-50 text-purple-700 border-purple-200",
    RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CLOSED: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border font-mono ${styles[status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
      {status}
    </span>
  );
}

function IncidentRow({
  incident,
  onAction,
}: {
  incident: IncidentItem;
  onAction: (id: string, action: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const detectedTime = incident.detected_at
    ? new Date(incident.detected_at).toLocaleString()
    : "—";

  const nextAction = (): string | null => {
    switch (incident.status) {
      case "DETECTED":
        return "acknowledge";
      case "ACKNOWLEDGED":
        return "investigate";
      case "INVESTIGATING":
        return "resolve";
      default:
        return null;
    }
  };

  const actionLabel: Record<string, string> = {
    acknowledge: "Acknowledge",
    investigate: "Investigate",
    resolve: "Resolve",
  };

  const action = nextAction();

  return (
    <>
      <tr
        onClick={() => setExpanded((p) => !p)}
        className="hover:bg-slate-50/80 cursor-pointer transition-colors border-b border-slate-100 text-xs"
      >
        <td className="py-3 px-4">
          <SeverityBadge severity={incident.severity} />
        </td>
        <td className="py-3 px-4">
          <div className="font-semibold text-slate-900">{incident.title}</div>
          {incident.service && (
            <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
              <span>Service: <strong className="text-slate-700">{incident.service}</strong></span>
              {incident.rule_id && <span>• Rule: <span className="text-indigo-600">{incident.rule_id}</span></span>}
            </div>
          )}
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-1.5">
            <StatusBadge status={incident.status} />
            {incident.auto_resolved && (
              <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                auto
              </span>
            )}
          </div>
        </td>
        <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
          {detectedTime}
        </td>
        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-2">
            {action && (
              <button
                onClick={() => onAction(incident.id, action)}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                {actionLabel[action]}
              </button>
            )}
            <button
              onClick={() => setExpanded((p) => !p)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-slate-50/60 border-b border-slate-200">
          <td colSpan={5} className="p-4">
            <div className="space-y-3 max-w-4xl mx-auto">
              {/* Description */}
              {incident.description && (
                <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <strong className="text-slate-900 block mb-0.5">Description:</strong>
                  {incident.description}
                </div>
              )}

              {/* AI Analysis */}
              {incident.latest_analysis && (
                <div className="p-3.5 rounded-xl bg-white border border-indigo-100 shadow-2xs space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5 font-mono">
                    <BrainCircuit className="w-3.5 h-3.5" />
                    AI Root Cause Analysis • {incident.latest_analysis.model_used || "Synexis-RCA"}
                  </div>
                  {incident.latest_analysis.root_cause && (
                    <div className="text-xs font-semibold text-slate-900">
                      Root Cause: <span className="text-slate-700 font-normal">{incident.latest_analysis.root_cause}</span>
                    </div>
                  )}
                  {incident.latest_analysis.confidence !== null && incident.latest_analysis.confidence !== undefined && (
                    <div className="text-xs text-slate-600">
                      Confidence: <strong className="text-indigo-600 font-mono">{incident.latest_analysis.confidence}%</strong>
                    </div>
                  )}
                  {incident.latest_analysis.recommendation && (
                    <div className="text-xs text-slate-700 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                      <strong className="text-indigo-900 block mb-0.5">Recommendation:</strong>
                      {incident.latest_analysis.recommendation}
                    </div>
                  )}
                </div>
              )}

              {/* Evidence */}
              {incident.evidence && incident.evidence.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Correlated Evidence ({incident.evidence.length})
                  </div>
                  <div className="space-y-1">
                    {incident.evidence.map((ev, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg bg-white border border-slate-200 text-xs flex items-start gap-2 shadow-2xs"
                      >
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold shrink-0">
                          {ev.type}
                        </span>
                        <div className="min-w-0">
                          <span className="text-slate-400 font-mono text-[11px] mr-2">[{ev.source}]</span>
                          <span className="text-slate-800">{ev.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function IncidentsView() {
  const [activeIncidents, setActiveIncidents] = useState<IncidentItem[]>([]);
  const [resolvedIncidents, setResolvedIncidents] = useState<IncidentItem[]>([]);
  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "resolved">("active");
  const [lastRefresh, setLastRefresh] = useState("");

  const fetchIncidents = useCallback(async () => {
    try {
      const data = await api.getIncidents();
      setActiveIncidents(data.active_incidents || []);
      setResolvedIncidents(data.resolved_incidents || []);
      setStats(data.stats || null);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch {
      /* backend sync handling */
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAction = async (id: string, action: string) => {
    try {
      if (action === "acknowledge") await api.acknowledgeIncident(id);
      else if (action === "investigate") await api.investigateIncident(id);
      else if (action === "resolve") await api.resolveIncident(id, "Resolved by SRE Operator");
      await fetchIncidents();
    } catch (err) {
      console.error("Action error:", err);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const displayedIncidents = tab === "active" ? activeIncidents : resolvedIncidents;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 leading-tight flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-indigo-600" />
              Incidents & Rule Violations Console
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-mono">
              Auto-Synced (5s)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time incident stream detected by Synexis Detection Engine and database backend
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              Updated: {lastRefresh}
            </span>
          )}
          <button
            onClick={fetchIncidents}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>Sync Incidents</span>
          </button>
        </div>
      </div>

      {/* ── Stat Summary Cards ── */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="text-2xl font-bold text-slate-900 font-mono">{stats.active}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Active Incidents</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className={`text-2xl font-bold font-mono ${stats.critical_active > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {stats.critical_active}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Critical Active</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="text-2xl font-bold text-indigo-600 font-mono">{stats.resolved_today}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Resolved Today</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="text-2xl font-bold text-slate-700 font-mono">{stats.total}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Total All-Time</div>
          </div>
        </div>
      )}

      {/* ── Tabs Navigation ── */}
      <div className="flex border-b border-slate-200 gap-4">
        {(["active", "resolved"] as const).map((t) => {
          const count = t === "active" ? activeIncidents.length : resolvedIncidents.length;
          const isActive = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                isActive
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>{t === "active" ? "Active Incidents" : "Resolved Incidents"}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isActive ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-slate-100 text-slate-600"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Incidents Table ── */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 font-mono">
          Syncing latest incidents from backend detection engine...
        </div>
      ) : displayedIncidents.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <div className="text-sm font-bold text-slate-900">
            {tab === "active" ? "No Active Incidents" : "No Resolved Incidents"}
          </div>
          <div className="text-xs text-slate-500 max-w-sm mx-auto">
            {tab === "active"
              ? "All systems are operating normally. Any triggered detection rules will appear here automatically."
              : "Resolved incidents will accumulate here for post-incident review."}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-24">Severity</th>
                <th className="py-3 px-4">Incident & Service</th>
                <th className="py-3 px-4 w-36">Status</th>
                <th className="py-3 px-4 w-44">Detected</th>
                <th className="py-3 px-4 w-32 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedIncidents.map((inc) => (
                <IncidentRow key={inc.id} incident={inc} onAction={handleAction} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
