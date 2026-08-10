"use client";

import React, { useState } from "react";
import { 
  X, 
  BrainCircuit, 
  AlertOctagon, 
  CheckCircle2, 
  ShieldCheck, 
  Terminal, 
  ArrowRight, 
  Play, 
  CheckCircle,
  Clock,
  Activity,
  Layers
} from "lucide-react";
import { RCAReport, RecommendedAction, api } from "../lib/api";

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: RCAReport | null;
  onRemediationComplete?: () => void;
}

export const IncidentInvestigationModal: React.FC<IncidentModalProps> = ({
  isOpen,
  onClose,
  report,
  onRemediationComplete,
}) => {
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<any | null>(null);

  if (!isOpen || !report) return null;

  const handleApproveAction = async (action: RecommendedAction) => {
    setExecutingActionId(action.id);
    setExecutionResult(null);
    try {
      const res = await api.executeRemediation({
        action_id: action.id,
        target_id: action.target_id,
        action_type: action.action_type,
        command: action.command
      });
      setExecutionResult(res);
      if (onRemediationComplete) {
        onRemediationComplete();
      }
    } catch (err: any) {
      setExecutionResult({ status: "FAILED", error: err.message });
    } finally {
      setExecutingActionId(null);
    }
  };

  const isHealthy = report.status === "HEALTHY";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${
              isHealthy
                ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-400"
                : "bg-rose-950/80 border-rose-500/40 text-rose-400"
            }`}>
              {isHealthy ? <ShieldCheck className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md font-mono ${
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
              <h2 className="text-lg font-bold text-white mt-0.5">
                {report.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                AI Confidence
              </span>
              <span className="text-base font-bold font-mono text-indigo-400">
                {report.confidence_score}%
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Section 1: Problem Overview */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              What Happened?
            </span>
            <p className="text-sm font-medium text-slate-200">
              {report.detected_issue}
            </p>
            {report.impact && (
              <p className="text-xs text-amber-300/90 font-mono bg-amber-950/20 p-2 rounded border border-amber-900/40">
                <strong>Impact:</strong> {report.impact}
              </p>
            )}
          </div>

          {/* Section 2: AI Root Cause Analysis */}
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
              AI Root Cause Analysis (RCA)
            </span>
            <p className="text-sm font-semibold text-white leading-relaxed">
              {report.probable_root_cause}
            </p>
            {report.ai_explanation && (
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                {report.ai_explanation}
              </p>
            )}
          </div>

          {/* Section 3: Evidence Chain */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Correlated Observability Evidence ({report.evidence_chain.length} Signals)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {report.evidence_chain.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start space-x-2.5"
                >
                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-slate-900 border border-slate-700 text-cyan-400 shrink-0">
                    {ev.type}
                  </span>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {ev.source}
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      {ev.detail}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Safe Remediation Actions */}
          {!isHealthy && !executionResult && report.recommended_actions.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Recommended Safe Remediation Plan (Human-in-the-Loop)
                </span>
                <span className="text-[10px] text-slate-400">
                  Explicit approval required before execution
                </span>
              </div>

              <div className="space-y-2.5">
                {report.recommended_actions.map((act) => {
                  const isExecuting = executingActionId === act.id;

                  return (
                    <div
                      key={act.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-white">
                            {act.title}
                          </span>
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                            act.risk_level === "LOW"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : "bg-amber-950 text-amber-300 border border-amber-800"
                          }`}>
                            Risk: {act.risk_level}
                          </span>
                        </div>
                        <code className="text-[11px] font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 block">
                          {act.command}
                        </code>
                      </div>

                      <button
                        onClick={() => handleApproveAction(act)}
                        disabled={isExecuting || executingActionId !== null}
                        className="ml-4 shrink-0 flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-950/40 transition-all text-xs"
                      >
                        <Play className={`w-3.5 h-3.5 ${isExecuting ? "animate-spin" : ""}`} />
                        <span>{isExecuting ? "Executing..." : "Approve & Execute"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 5: Live Execution & Post-Verification Console */}
          {executionResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Remediation Execution Succeeded ({executionResult.duration_ms}ms)
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {executionResult.timestamp}
                </span>
              </div>

              {/* Console Logs */}
              <div className="p-3 rounded-lg bg-black/80 font-mono text-[11px] text-slate-300 space-y-1 border border-slate-800">
                {executionResult.execution_logs?.map((l: string, i: number) => (
                  <div key={i} className="leading-relaxed">
                    {l}
                  </div>
                ))}
              </div>

              {/* 4-Point Health Verification Checkmarks */}
              {executionResult.verification && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Post-Remediation Health Verification
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {executionResult.verification.map((v: any, i: number) => (
                      <div key={i} className="flex items-center space-x-2 text-xs p-2 rounded bg-slate-900 border border-slate-800">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div>
                          <strong className="text-white block">{v.check}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">{v.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
