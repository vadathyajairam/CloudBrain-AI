"use client";

import React, { useState, useEffect } from "react";
import { 
  Wrench, 
  ShieldCheck, 
  CheckCircle2, 
  Terminal, 
  Clock, 
  Activity, 
  Layers, 
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { api } from "../lib/api";

export const RemediationView: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getRemediationHistory();
      if (res.history) {
        setHistory(res.history);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-400" />
            Human-in-the-Loop Safe Remediation Console
          </h2>
          <p className="text-xs text-slate-400">
            Audit log of operator-approved automated actions, command executions, and post-remediation health verifications
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Audit Log</span>
        </button>
      </div>

      {/* Safety Architecture Policy Card */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            CloudBrain Safety Protocol Active
          </span>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            AI agents are prohibited from executing raw mutating operations without explicit human authorization. All commands undergo dry-run validation, permission signature verification, and a 4-point health verification check.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
            POLICY: ENFORCED
          </span>
        </div>
      </div>

      {/* Execution History */}
      <div className="space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-cyan-400" />
          Remediation Audit Trail ({history.length} Events)
        </span>

        {history.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-500 text-xs font-mono">
            No remediation actions executed yet. When you approve fixes in the AI Analysis or Incidents center, audit trails will appear here.
          </div>
        ) : (
          history.map((record) => (
            <div
              key={record.id}
              className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-white">
                    Action: {record.action_id}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Target: <strong className="text-indigo-300">{record.target_id}</strong>
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-xs font-mono">
                  <span className="text-slate-500">{record.timestamp}</span>
                  <span className="text-cyan-400 font-bold">{record.duration_ms}ms</span>
                </div>
              </div>

              {/* Command */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-cyan-300">
                <span className="text-slate-500 mr-2">$</span>
                {record.command}
              </div>

              {/* Logs */}
              <div className="p-3 rounded-lg bg-black/80 font-mono text-[11px] text-slate-300 space-y-0.5 border border-slate-800">
                {record.execution_logs?.map((l: string, idx: number) => (
                  <div key={idx}>{l}</div>
                ))}
              </div>

              {/* Health Verification Points */}
              {record.verification && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {record.verification.map((v: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 text-xs p-2 rounded bg-slate-900/60 border border-slate-800"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-white font-semibold block">{v.check}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{v.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
