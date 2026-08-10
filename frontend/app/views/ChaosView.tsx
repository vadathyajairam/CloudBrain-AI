"use client";

import React, { useState } from "react";
import { 
  Flame, 
  Play, 
  RefreshCcw, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Terminal, 
  Activity 
} from "lucide-react";
import { ChaosScenario } from "../lib/api";

interface ChaosViewProps {
  scenarios: ChaosScenario[];
  activeScenario: string | null;
  onTrigger: (scenarioId: string) => Promise<void>;
  onReset: () => Promise<void>;
  onOpenInvestigation: () => void;
}

export const ChaosView: React.FC<ChaosViewProps> = ({
  scenarios,
  activeScenario,
  onTrigger,
  onReset,
  onOpenInvestigation,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleTrigger = async (id: string) => {
    setLoadingId(id);
    try {
      await onTrigger(id);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReset = async () => {
    setLoadingId("reset");
    try {
      await onReset();
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            Chaos Sandbox & Real-World Failure Lab
          </h2>
          <p className="text-xs text-slate-400">
            Inject realistic production outages to showcase CloudBrain AI’s end-to-end detection, RCA, and remediation workflow
          </p>
        </div>

        {activeScenario && (
          <button
            onClick={handleReset}
            disabled={loadingId === "reset"}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loadingId === "reset" ? "animate-spin" : ""}`} />
            <span>Reset All Failure States</span>
          </button>
        )}
      </div>

      {/* Active Incident Warning */}
      {activeScenario && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 shadow-xl shadow-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
            <div>
              <span className="text-rose-200 font-semibold block">
                Chaos Outage Active: <strong className="text-white font-mono">{activeScenario}</strong>
              </span>
              <span className="text-slate-300 text-[11px]">
                Metrics and error logs are currently degraded. Inspect the diagnosis in the AI Root Cause tab.
              </span>
            </div>
          </div>

          <button
            onClick={onOpenInvestigation}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg transition-all"
          >
            Investigate Incident →
          </button>
        </div>
      )}

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((sc) => {
          const isActive = activeScenario === sc.id;
          const isLoading = loadingId === sc.id;

          return (
            <div
              key={sc.id}
              className={`p-5 rounded-2xl border backdrop-blur-xl transition-all flex flex-col justify-between ${
                isActive
                  ? "bg-rose-950/30 border-rose-500 shadow-xl shadow-rose-950/30"
                  : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded ${
                    sc.severity === "CRITICAL"
                      ? "bg-rose-950 text-rose-300 border border-rose-800"
                      : "bg-amber-950 text-amber-300 border border-amber-800"
                  }`}>
                    {sc.severity}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Target: {sc.target_service}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white leading-tight">
                  {sc.title}
                </h3>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {sc.description}
                </p>

                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">
                    Expected Symptoms:
                  </span>
                  {sc.symptoms.map((s, idx) => (
                    <div key={idx} className="text-[10px] text-slate-300 font-mono bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                      • {s}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleTrigger(sc.id)}
                  disabled={isActive || isLoading}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    isActive
                      ? "bg-rose-600/30 text-rose-300 border border-rose-500/50 cursor-default"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/50"
                  }`}
                >
                  <Play className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  <span>{isActive ? "Currently Simulating" : "Trigger Chaos Scenario"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
