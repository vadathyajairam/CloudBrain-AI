"use client";

import React, { useState } from "react";
import {
  Menu,
  Search,
  RefreshCw,
  Bell,
  Bot,
  UserCheck,
  Zap,
  Activity,
  Flame,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldAlert,
} from "lucide-react";
import { SystemMetrics } from "../lib/api";

interface NavbarProps {
  metrics: SystemMetrics | null;
  activeScenario: string | null;
  refreshRate: number;
  setRefreshRate: (rate: number) => void;
  onOpenChaosModal: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  pageTitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  metrics,
  activeScenario,
  refreshRate,
  setRefreshRate,
  onOpenChaosModal,
  onToggleChat,
  isChatOpen,
  pageTitle = "dashboard",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const pageTitleMap: Record<string, string> = {
    dashboard: "Overview Dashboard",
    monitoring: "Host Telemetry",
    logs: "Log Stream & Analytics",
    ai_rca: "AI Root Cause Analysis (RCA)",
    incidents: "Incidents Lifecycle Stream",
    containers: "Docker Container Fleet",
    kubernetes: "Local Kubernetes Cluster",
    simulation: "Cloud Infrastructure Simulation",
    data_sources: "Integrations & Data Sources",
    artifacts: "Config Artifact & IaC Generator",
    config: "Configuration & Security Audits",
    remediation: "Remediation & Audit Trail",
    chaos: "Chaos Sandbox Laboratory",
    assistant: "DevOps AI Copilot",
  };

  const formattedTitle = pageTitleMap[pageTitle] || "Synexis Operations Center";

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      {/* ── Left Title Section ── */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
          {formattedTitle}
        </h1>
        {activeScenario && (
          <span className="hidden md:flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full animate-pulse">
            <Flame className="w-3 h-3" />
            Outage Active: {activeScenario}
          </span>
        )}
      </div>

      {/* ── Center Search Bar (Hidden on Mobile) ── */}
      <div className="hidden md:flex items-center flex-1 max-w-xs mx-6 relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          placeholder="Search logs, incidents, containers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-12 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
        />
        <kbd className="absolute right-2.5 text-[10px] font-mono text-slate-400 bg-slate-200/60 px-1 py-0.2 rounded">
          ⌘K
        </kbd>
      </div>

      {/* ── Right Section Controls ── */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Refresh Rate Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshRate > 0 ? "animate-spin" : ""}`} style={{ animationDuration: "4s" }} />
          <select
            value={refreshRate}
            onChange={(e) => setRefreshRate(Number(e.target.value))}
            className="bg-transparent text-slate-700 font-medium text-xs focus:outline-none cursor-pointer"
          >
            <option value={2000}>2s (Standard)</option>
            <option value={5000}>5s (Slow)</option>
            <option value={10000}>10s (Minimal)</option>
            <option value={0}>Paused</option>
          </select>
        </div>

        {/* AI Copilot Button */}
        <button
          onClick={onToggleChat}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            isChatOpen
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
              : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
          }`}
        >
          <Bot className="w-4 h-4" />
          <span className="hidden sm:inline">AI Copilot</span>
        </button>

        {/* Notification Icon & Dropdown Popover */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`p-1.5 rounded-lg relative cursor-pointer transition-colors ${
              isNotificationsOpen ? "bg-slate-200 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Notifications & Alerts"
          >
            <Bell className="w-4 h-4" />
            {(activeScenario || (metrics && metrics.status !== "HEALTHY")) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-1 border-2 border-white animate-pulse" />
            )}
          </button>

          {/* Notification Popover Panel */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900">System Notifications & Alerts</span>
                </div>
                <button
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Alert items list */}
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {activeScenario ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-rose-800">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Active Outage: {activeScenario.replace(/_/g, " ").toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono bg-rose-200/80 px-1.5 py-0.5 rounded text-rose-900">CRITICAL</span>
                    </div>
                    <p className="text-[11px] text-rose-700">
                      Live chaos outage injected. Detection engine rules active. Review Root Cause Analysis and proposed remediation in the dashboard.
                    </p>
                  </div>
                ) : null}

                {metrics && metrics.status !== "HEALTHY" ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-amber-900">
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-amber-600" />
                        System Telemetry Alert
                      </span>
                      <span className="text-[10px] font-mono bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-900">
                        {metrics.status} ({metrics.health_score}/100)
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Host CPU: {metrics.cpu.usage_percent}% | RAM: {metrics.memory.usage_percent}% | Disk: {metrics.disk.usage_percent}%
                    </p>
                  </div>
                ) : null}

                {!activeScenario && (!metrics || metrics.status === "HEALTHY") && (
                  <div className="p-4 text-center bg-slate-50 border border-slate-100 rounded-lg space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                    <div className="text-xs font-semibold text-slate-800">All Systems Nominal</div>
                    <p className="text-[11px] text-slate-500">
                      No active critical alerts. Telemetry pipeline probing psutil and Docker SDK every {refreshRate / 1000}s.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-mono">Synexis Telemetry Pipeline</span>
                <button
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    onOpenChaosModal();
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  Test Chaos Sandbox →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Compact Operator Authorization & Role Indicator */}
        <div className="flex items-center pl-2 border-l border-slate-200">
          <div className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/80 text-slate-700 flex items-center gap-1.5 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="font-semibold text-slate-800">SRE Operator</span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-mono text-slate-500 font-medium">Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
};
