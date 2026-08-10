"use client";

import React, { useState } from "react";
import { Flame, X, CheckCircle, AlertTriangle, Play, RefreshCcw, ShieldAlert } from "lucide-react";
import { ChaosScenario } from "../lib/api";

interface ChaosModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: ChaosScenario[];
  activeScenario: string | null;
  onTrigger: (scenarioId: string) => Promise<void>;
  onReset: () => Promise<void>;
}

export const ChaosModal: React.FC<ChaosModalProps> = ({
  isOpen,
  onClose,
  scenarios,
  activeScenario,
  onTrigger,
  onReset,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-600/50 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Chaos Sandbox & Failure Injection Lab
              </h2>
              <p className="text-xs text-slate-400">
                Simulate production outages to test CloudBrain AI’s automated detection, RCA, and remediation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Scenario Banner */}
        {activeScenario && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                Active Outage: <strong className="text-white font-mono">{activeScenario}</strong>
              </span>
            </div>
            <button
              onClick={handleReset}
              disabled={loadingId === "reset"}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-lg transition-all"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loadingId === "reset" ? "animate-spin" : ""}`} />
              <span>Reset & Restore Baselines</span>
            </button>
          </div>
        )}

        {/* Scenarios Grid */}
        <div className="mt-4 space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
          {scenarios.map((sc) => {
            const isActive = activeScenario === sc.id;
            const isLoading = loadingId === sc.id;

            return (
              <div
                key={sc.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isActive
                    ? "bg-rose-950/30 border-rose-500 shadow-md shadow-rose-950/40"
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded font-mono ${
                        sc.severity === "CRITICAL"
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : "bg-amber-950 text-amber-300 border border-amber-800"
                      }`}>
                        {sc.severity}
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {sc.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {sc.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {sc.symptoms.map((sym, i) => (
                        <span key={i} className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          • {sym}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleTrigger(sc.id)}
                    disabled={isActive || isLoading}
                    className={`ml-3 shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-rose-600/30 text-rose-300 border border-rose-500/50 cursor-default"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:shadow-indigo-600/30"
                    }`}
                  >
                    <Play className="w-3 h-3" />
                    <span>{isActive ? "Simulating..." : "Inject Outage"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Student Demo Mode • Zero Cloud Costs Required</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
