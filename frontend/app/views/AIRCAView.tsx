"use client";

import React, { useState } from "react";
import {
  BrainCircuit,
  Layers,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Play,
  Terminal,
  Activity,
  ArrowRight,
  RefreshCw,
  BookOpen,
  Check,
} from "lucide-react";
import { RCAReport, StructuredAction, api } from "../lib/api";

interface AIRCAViewProps {
  report: RCAReport | null;
  onRefresh: () => Promise<void>;
}

export const AIRCAView: React.FC<AIRCAViewProps> = ({ report, onRefresh }) => {
  const [proposingAction, setProposingAction] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleProposeRemediation = async (action: StructuredAction) => {
    setProposingAction(action.target);
    setActionSuccess(null);
    try {
      await api.proposeRemediation({
        action_type: action.action,
        target: action.target,
        reason: action.reason,
        incident_id: report?.incident_id,
      });
      setActionSuccess(`Remediation action proposed for ${action.target}. Go to Remediation Console to approve and execute.`);
      await onRefresh();
    } catch (err: any) {
      alert(`Error proposing remediation: ${err.message}`);
    } finally {
      setProposingAction(null);
    }
  };

  if (!report) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs font-mono">
        Loading Synexis AI Root Cause Analysis engine...
      </div>
    );
  }

  const isHealthy = !report.root_cause || report.root_cause.includes("No anomaly") || report.root_cause.includes("Insufficient telemetry");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 leading-tight flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-600" />
              AI Root Cause Analysis & RAG Grounding
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full">
              RAG Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated reasoning grounded in live host compute, Docker logs, container states, and curated DevOps runbooks
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
          <span>Re-evaluate Signals</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* ── Main Diagnostic Card ── */}
      <div
        className={`p-5 rounded-xl border bg-white shadow-sm transition-all ${
          isHealthy ? "border-slate-200" : "border-amber-300 ring-1 ring-amber-200"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isHealthy
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                  : "bg-rose-50 border-rose-200 text-rose-600"
              }`}
            >
              {isHealthy ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                {isHealthy ? "System Health Nominal" : "Active Anomaly Detected & Diagnosed"}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                Model: <span className="text-indigo-600 font-semibold">{report.model_used}</span> • Incident ID:{" "}
                <span className="text-slate-700">{report.incident_id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {report.confidence !== null && (
              <div className="px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-right">
                <div className="text-[10px] text-indigo-500 font-medium uppercase tracking-wider">
                  Confidence
                </div>
                <div className="text-sm font-bold text-indigo-700 font-mono">
                  {report.confidence}%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Root Cause & Recommendations */}
        <div className="py-4 space-y-4">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Probable Root Cause
            </div>
            <div className="text-sm font-semibold text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
              {report.root_cause}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Recommended Remediation Strategy
            </div>
            <div className="text-xs text-slate-700 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 leading-relaxed">
              {report.recommendation}
            </div>
          </div>

          {report.alternative_causes && report.alternative_causes.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Alternative Potential Causes Considered
              </div>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                {report.alternative_causes.map((alt, idx) => (
                  <li key={idx}>{alt}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Structured Remediation Actions */}
        {report.structured_actions && report.structured_actions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Proposed Safety-Allowlisted Remediation Actions
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.structured_actions.map((act, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 font-mono">
                      {act.action} <span className="text-indigo-600 font-normal">→ {act.target}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">{act.reason}</div>
                  </div>
                  <button
                    onClick={() => handleProposeRemediation(act)}
                    disabled={proposingAction === act.target}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-xs disabled:opacity-50"
                  >
                    {proposingAction === act.target ? "Proposing..." : "Propose Fix"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── RAG Knowledge Base Citations ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Retrieved Synexis RAG Runbooks & Lessons
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Hybrid Vector & BM25 Scoring
          </span>
        </div>

        {report.rag_sources && report.rag_sources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {report.rag_sources.map((src, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 hover:border-indigo-200 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                    {src.category}
                  </span>
                  {src.score && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Relevance: {Math.round(src.score * 100)}%
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-slate-800 leading-snug">
                  {src.title}
                </div>
                {src.content && (
                  <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed">
                    {src.content.replace(/^#+ .*\n/, "")}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500 p-4 text-center">
            No specific runbook citations required for baseline telemetry.
          </div>
        )}
      </div>

      {/* ── Multi-Source Evidence Chain ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System & Docker Telemetry Evidence */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="text-xs font-bold text-slate-800 flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-500" />
              Live Telemetry Evidence Bundle
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Source: Host + Docker SDK</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Host CPU Utilization:</span>
              <span className="font-mono font-bold text-slate-800">
                {report.evidence_bundle?.system?.cpu_percent ?? 0}%
              </span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Host Memory Utilization:</span>
              <span className="font-mono font-bold text-slate-800">
                {report.evidence_bundle?.system?.memory_percent ?? 0}%
              </span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-600">System Health Score:</span>
              <span className="font-mono font-bold text-emerald-600">
                {report.evidence_bundle?.system?.health_score ?? 100} / 100
              </span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Recent Log Errors (30s):</span>
              <span className="font-mono font-bold text-slate-800">
                {report.evidence_bundle?.log_stats?.errors_last_30s ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Error Log Samples */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="text-xs font-bold text-slate-800 flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-slate-700" />
              Correlated Error Log Samples
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Source: Docker Logs</span>
          </div>

          {report.evidence_bundle?.error_samples && report.evidence_bundle.error_samples.length > 0 ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]">
              {report.evidence_bundle.error_samples.map((err, idx) => (
                <div key={idx} className="p-2 rounded bg-rose-50 border border-rose-100 text-rose-900">
                  <span className="font-bold">[{err.level}] {err.service}: </span>
                  <span>{err.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">
              No recent error anomalies found in log buffers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
