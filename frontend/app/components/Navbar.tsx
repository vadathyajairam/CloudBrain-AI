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
    <header className="h-14 bg-white border-b border-slate-200/90 px-4 flex items-center justify-between sticky top-0 z-20 shadow-xs select-none">
      {/* ── Left Section ── */}
      <div className="flex items-center gap-3">
        <button className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer md:hidden">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-bold text-slate-900 tracking-tight">{formattedTitle}</h1>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Telemetry</span>
        </div>
        {activeScenario && (
          <button
            onClick={onOpenChaosModal}
            className="flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce cursor-pointer"
          >
            <Flame className="w-3 h-3 text-rose-600" />
            <span>Chaos: {activeScenario}</span>
          </button>
        )}
      </div>

      {/* ── Center Search Box ── */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search runbooks, metrics, incidents..."
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-800 placeholder-slate-400 text-xs pl-9 pr-12 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
            ⌘K
          </kbd>
        </div>
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

        {/* Notification Icon */}
        <button className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg relative cursor-pointer transition-colors">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-1 border-2 border-white" />
        </button>

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
