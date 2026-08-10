"use client";

import React, { useState, useEffect } from "react";
import { 
  AlertOctagon, 
  CheckCircle2, 
  BrainCircuit, 
  Clock, 
  ArrowRight, 
  Filter, 
  ShieldAlert,
  Flame
} from "lucide-react";
import { api } from "../lib/api";

interface IncidentsViewProps {
  onInvestigate: (incidentData?: any) => void;
  onOpenChaosModal: () => void;
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({ onInvestigate, onOpenChaosModal }) => {
  const [data, setData] = useState<{ active_count: number; active_incidents: any[]; resolved_incidents: any[] }>({
    active_count: 0,
    active_incidents: [],
    resolved_incidents: []
  });
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");

  const fetchIncidents = async () => {
    try {
      const res = await api.getIncidents();
      setData(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-400" />
            DevOps Incidents & Outage Center
          </h2>
          <p className="text-xs text-slate-400">
            Real-time incident response queue, root-cause correlation, and post-mortem histories
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs font-mono">
            {(["all", "active", "resolved"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md transition-all uppercase ${
                  filter === f
                    ? "bg-indigo-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenChaosModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-semibold hover:bg-amber-900/60 transition-colors"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Simulate Outage</span>
          </button>
        </div>
      </div>

      {/* Active Incidents Section */}
      {(filter === "all" || filter === "active") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Active Incidents ({data.active_incidents.length})
            </span>
          </div>

          {data.active_incidents.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs flex flex-col items-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400/80" />
              <span className="font-semibold text-white">No active outages detected!</span>
              <span className="text-slate-500 max-w-sm">
                All cloud services, background workers, and container health checks are passing within normal parameters.
              </span>
            </div>
          ) : (
            data.active_incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-rose-500/50 shadow-xl shadow-rose-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-rose-950 text-rose-300 border border-rose-700 font-mono">
                      {inc.severity}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {inc.id} • {inc.timestamp}
                    </span>
                    <span className="text-xs text-indigo-400 font-mono font-bold">
                      Confidence: {inc.confidence}%
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">
                    {inc.title}
                  </h3>

                  <p className="text-xs text-slate-300 max-w-3xl">
                    {inc.detected_issue}
                  </p>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-sans">
                    <strong className="text-indigo-400 font-mono">AI Root Cause: </strong>
                    {inc.probable_root_cause}
                  </div>
                </div>

                <button
                  onClick={() => onInvestigate(inc)}
                  className="shrink-0 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg transition-all"
                >
                  <BrainCircuit className="w-4 h-4" />
                  <span>Investigate & Fix</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Resolved Incidents History */}
      {(filter === "all" || filter === "resolved") && (
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Resolved Incidents & Post-Mortem Audit ({data.resolved_incidents.length})
          </span>

          <div className="space-y-2.5">
            {data.resolved_incidents.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.2 text-[9px] font-bold rounded bg-slate-900 text-emerald-400 border border-emerald-800 font-mono">
                      RESOLVED
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      {r.id} • {r.timestamp}
                    </span>
                  </div>
                  <h4 className="font-semibold text-white text-xs">
                    {r.title}
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    <strong>Resolution:</strong> {r.resolution}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-[10px] text-slate-500 font-mono block">AI Verified</span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">{r.confidence}% confidence</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
