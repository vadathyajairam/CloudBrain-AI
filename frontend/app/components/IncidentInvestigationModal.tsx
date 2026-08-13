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
  Clock,
  Activity,
  BookOpen,
} from "lucide-react";
import { RCAReport, StructuredAction, api } from "../lib/api";

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

  const handleApproveAction = async (action: StructuredAction) => {
    setExecutingActionId(action.target);
    setExecutionResult(null);
    try {
      // 1. Propose
      const prop = await api.proposeRemediation({
        action_type: action.action,
        target: action.target,
        reason: action.reason,
        incident_id: report.incident_id,
      });

      // 2. Approve & Execute immediately
      const res = await api.approveRemediation(prop.id, "admin", "admin");
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

  const isHealthy = !report.root_cause || report.root_cause.includes("No anomaly") || report.root_cause.includes("Insufficient telemetry");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isHealthy
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                  : "bg-rose-50 border-rose-200 text-rose-600"
              }`}
            >
              {isHealthy ? <ShieldCheck className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md font-mono bg-rose-50 text-rose-700 border border-rose-200">
                  INCIDENT INVESTIGATION
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {report.incident_id}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                {report.root_cause?.slice(0, 60) || "Active Telemetry Anomaly"}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {report.confidence !== null && (
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  AI Confidence
                </span>
                <span className="text-base font-bold font-mono text-indigo-600">
                  {report.confidence}%
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Root Cause & Strategy */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Identified Root Cause
            </div>
            <div className="text-sm font-semibold text-slate-800 leading-snug">
              {report.root_cause}
            </div>
            <div className="pt-2 text-slate-600 leading-relaxed">
              <strong>Recommendation:</strong> {report.recommendation}
            </div>
          </div>

          {/* RAG Knowledge Citations */}
          {report.rag_sources && report.rag_sources.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                Retrieved Synexis RAG Runbooks ({report.rag_sources.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {report.rag_sources.map((src, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100">
                    <div className="font-bold text-indigo-900">{src.title}</div>
                    <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{src.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Execution Result Banner */}
          {executionResult && (
            <div className={`p-4 rounded-xl border ${
              executionResult.status === "SUCCESS" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-900"
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Remediation Executed: {executionResult.status}
              </div>
              <div className="text-[11px] mt-1">
                {executionResult.verification?.summary || "Health verification checks completed."}
              </div>
            </div>
          )}

          {/* Structured Actions with Safe Approval */}
          {report.structured_actions && report.structured_actions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                Recommended Actions (Operator Authorization Required)
              </div>
              <div className="space-y-2">
                {report.structured_actions.map((act, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 font-mono">
                        {act.action} <span className="text-indigo-600 font-normal">→ {act.target}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{act.reason}</div>
                    </div>

                    <button
                      onClick={() => handleApproveAction(act)}
                      disabled={executingActionId === act.target}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{executingActionId === act.target ? "Executing..." : "Approve & Fix"}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
