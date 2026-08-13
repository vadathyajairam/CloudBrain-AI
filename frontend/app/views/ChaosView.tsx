"use client";

import React, { useState } from "react";
import { 
  Flame, 
  Play, 
  RefreshCcw, 
  AlertTriangle, 
  ShieldAlert, 
  Terminal, 
  Activity,
  ArrowRight
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 leading-tight flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              Chaos Sandbox & Real-World Failure Lab
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-mono">
              Controlled Environment
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Inject realistic production outages to showcase Synexis AI’s end-to-end detection, RCA, and remediation workflow
          </p>
        </div>

        {activeScenario && (
          <button
            onClick={handleReset}
            disabled={loadingId === "reset"}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loadingId === "reset" ? "animate-spin" : ""}`} />
            <span>Reset All Failure States</span>
          </button>
        )}
      </div>

      {/* Active Incident Warning */}
      {activeScenario && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 animate-pulse" />
            <div>
              <span className="text-rose-900 font-bold block">
                Chaos Outage Active: <strong className="font-mono text-rose-700">{activeScenario}</strong>
              </span>
              <span className="text-rose-700 text-[11px]">
                Metrics and error logs are currently degraded. Inspect the diagnosis in the AI Root Cause tab.
              </span>
            </div>
          </div>

          <button
            onClick={onOpenInvestigation}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 shrink-0"
          >
            <span>Investigate Incident</span>
            <ArrowRight className="w-3.5 h-3.5" />
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
              className={`p-5 rounded-xl border bg-white shadow-sm transition-all flex flex-col justify-between space-y-4 ${
                isActive
                  ? "border-rose-300 ring-2 ring-rose-200"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border ${
                    sc.severity === "CRITICAL"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {sc.severity}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Target: {sc.target_service}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  {sc.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {sc.description}
                </p>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block font-semibold">
                    Expected Symptoms:
                  </span>
                  {sc.symptoms.map((s, idx) => (
                    <div key={idx} className="text-[11px] text-slate-700 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                      • {s}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleTrigger(sc.id)}
                  disabled={isActive || isLoading}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    isActive
                      ? "bg-rose-50 text-rose-700 border border-rose-200 cursor-default"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
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
