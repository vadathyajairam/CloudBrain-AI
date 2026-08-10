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
  RefreshCw
} from "lucide-react";
import { RCAReport, RecommendedAction, api } from "../lib/api";

interface AIRCAViewProps {
  report: RCAReport | null;
  onRefresh: () => Promise<void>;
}

export const AIRCAView: React.FC<AIRCAViewProps> = ({ report, onRefresh }) => {
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleExecute = async (act: RecommendedAction) => {
    setExecutingId(act.id);
    setExecutionResult(null);
    try {
      const res = await api.executeRemediation({
        action_id: act.id,
        target_id: act.target_id,
        action_type: act.action_type,
        command: act.command
      });
      setExecutionResult(res);
      await onRefresh();
    } catch (err: any) {
      setExecutionResult({ status: "FAILED", error: err.message });
    } finally {
      setExecutingId(null);
    }
  };

  if (!report) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs font-mono">
        Loading AI Root Cause Analysis engine...
      </div>
    );
  }

  const isHealthy = report.status === "HEALTHY";

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-400" />
            AI Root Cause Analysis & Multi-Modal Correlator
          </h2>
          <p className="text-xs text-slate-400">
            Automated reasoning pipeline connecting CPU/RAM metrics, container telemetry, and log anomaly traces
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleManualRefresh}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Re-evaluate Signals</span>
          </button>
        </div>
      </div>

      {/* Main RCA Card */}
      <div className={`p-6 rounded-2xl border backdrop-blur-xl transition-all ${
        isHealthy
          ? "bg-slate-900/60 border-emerald-500/40 shadow-xl shadow-emerald-950/20"
          : "bg-slate-900/80 border-rose-500/50 shadow-2xl shadow-rose-950/30"
      }`}>
        {/* Banner Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className={`p-3 rounded-xl border ${
              isHealthy
                ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-400"
                : "bg-rose-950/80 border-rose-500/40 text-rose-400"
            }`}>
              {isHealthy ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded font-mono ${
                  report.severity === "CRITICAL"
                    ? "bg-rose-950 text-rose-300 border border-rose-800"
                    : report.severity === "HIGH"
                    ? "bg-amber-950 text-amber-300 border border-amber-800"
                    : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                }`}>
                  {report.severity}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {report.incident_id}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">
                {report.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-4 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                AI Diagnostic Confidence
              </span>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                    style={{ width: `${report.confidence_score}%` }}
                  />
                </div>
                <span className="text-xs font-bold font-mono text-cyan-300">
                  {report.confidence_score}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RCA Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {/* Detected Issue */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Detected Issue & Symptoms
            </span>
            <p className="text-xs font-medium text-slate-200 leading-relaxed">
              {report.detected_issue}
            </p>
            {report.impact && (
              <p className="text-[11px] text-amber-300 font-mono bg-amber-950/30 p-2 rounded border border-amber-900/40">
                <strong>Impact:</strong> {report.impact}
              </p>
            )}
          </div>

          {/* Probable Root Cause */}
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
              Probable Root Cause
            </span>
            <p className="text-xs font-semibold text-white leading-relaxed">
              {report.probable_root_cause}
            </p>
          </div>
        </div>

        {/* Observability Evidence Chain */}
        <div className="mt-5 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Correlated Evidence Signals ({report.evidence_chain.length})
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {report.evidence_chain.map((ev, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start space-x-3"
              >
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-slate-900 border border-slate-700 text-cyan-400 shrink-0">
                  {ev.type}
                </span>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-mono block">
                    Source: {ev.source}
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    {ev.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Explanation Deep Dive */}
        {report.ai_explanation && (
          <div className="mt-5 p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              AI Reasoning & Telemetry Synthesis
            </span>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {report.ai_explanation}
            </p>
          </div>
        )}

        {/* Remediation Action Plan */}
        {!isHealthy && report.recommended_actions.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Human-in-the-Loop Safe Remediation
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Requires manual operator approval
              </span>
            </div>

            <div className="space-y-2.5">
              {report.recommended_actions.map((act) => {
                const isExecuting = executingId === act.id;

                return (
                  <div
                    key={act.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-white">
                          {act.title}
                        </span>
                        <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                          act.risk_level === "LOW"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : "bg-amber-950 text-amber-300 border border-amber-800"
                        }`}>
                          Risk: {act.risk_level}
                        </span>
                      </div>
                      <code className="text-xs font-mono text-cyan-300 bg-slate-900 px-2 py-1 rounded border border-slate-800 block">
                        {act.command}
                      </code>
                    </div>

                    <button
                      onClick={() => handleExecute(act)}
                      disabled={isExecuting || executingId !== null}
                      className="shrink-0 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all"
                    >
                      <Play className={`w-3.5 h-3.5 ${isExecuting ? "animate-spin" : ""}`} />
                      <span>{isExecuting ? "Executing..." : "Approve & Execute Fix"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Execution Output Result */}
        {executionResult && (
          <div className="mt-5 p-4 rounded-xl bg-slate-950 border border-emerald-500/50 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Remediation Completed & Verified ({executionResult.duration_ms}ms)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {executionResult.timestamp}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-black/90 font-mono text-[11px] text-slate-300 space-y-1 border border-slate-800">
              {executionResult.execution_logs?.map((l: string, i: number) => (
                <div key={i}>{l}</div>
              ))}
            </div>

            {executionResult.verification && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {executionResult.verification.map((v: any, i: number) => (
                  <div key={i} className="flex items-center space-x-2 text-xs p-2 rounded bg-slate-900 border border-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <div>
                      <strong className="text-white block">{v.check}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">{v.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
