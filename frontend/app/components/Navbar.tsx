"use client";

import React, { useState } from "react";
import {
  Menu,
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  Activity,
  RefreshCw,
  Flame,
  Bot,
  Database,
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

const TAB_LABELS: Record<string, string> = {
  dashboard: "Overview Dashboard",
  monitoring: "Live Host Telemetry",
  logs: "Log Stream & Pattern Analysis",
  ai_rca: "AI Root Cause Analysis (RCA)",
  incidents: "Incident Lifecycle Console",
  containers: "Docker Sandbox Containers",
  remediation: "Remediation & Approval Console",
  data_sources: "Data Sources & Connectivity",
  config: "Config & Security Auditing",
  chaos: "Chaos Sandbox Lab",
  assistant: "AI DevOps Copilot",
};

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
  const [searchFocused, setSearchFocused] = useState(false);
  const isChaosActive = activeScenario !== null;
  const alertCount = isChaosActive ? 2 : metrics?.status === "DEGRADED" ? 1 : 0;

  return (
    <header className="h-[61px] flex items-center border-b border-slate-200 bg-white z-40 sticky top-0 shrink-0 shadow-sm">
      {/* ── Brand Area (aligns with sidebar width) ── */}
      <div className="w-64 flex items-center gap-2.5 px-4 border-r border-slate-200 h-full shrink-0">
        <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 flex items-center justify-center shadow-md shadow-indigo-400/30 shrink-0">
          <Activity className="w-4 h-4 text-white" />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-teal-400 text-[7px] font-bold text-slate-900 shadow-sm">
            AI
          </span>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 leading-tight tracking-tight flex items-center gap-1.5">
            <span>Synexis</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
              v2.5
            </span>
          </div>
          <div className="text-[10px] text-slate-500 leading-tight truncate">
            Intelligent System Analysis & Automation
          </div>
        </div>
      </div>

      {/* ── Main Nav Area ── */}
      <div className="flex-1 flex items-center gap-3 px-4 h-full min-w-0">
        <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors shrink-0">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold text-slate-800">
            {TAB_LABELS[pageTitle] || "Dashboard"}
          </span>
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 font-mono">
            Source: Live Telemetry
          </span>
        </div>

        {/* Search */}
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 flex-1 max-w-sm transition-all border ${
            searchFocused
              ? "border-indigo-300 bg-white shadow-sm"
              : "border-slate-200 bg-slate-100 hover:border-slate-300"
          }`}
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search runbooks, metrics, incidents..."
            className="bg-transparent text-xs text-slate-600 placeholder-slate-400 outline-none flex-1 min-w-0"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <kbd className="hidden sm:inline text-[10px] text-slate-400 font-mono bg-slate-200 px-1.5 py-0.5 rounded shrink-0">
            ⌘K
          </kbd>
        </div>

        {/* ── Right Actions ── */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {/* Active Chaos pill */}
          {isChaosActive && (
            <button
              onClick={onOpenChaosModal}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-all animate-pulse shadow-sm"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Active Failure</span>
            </button>
          )}

          {/* Refresh rate selector */}
          <div className="hidden sm:flex items-center bg-slate-100 rounded-lg border border-slate-200 p-0.5">
            <button
              onClick={() => setRefreshRate(refreshRate === 0 ? 2000 : 0)}
              className="p-1.5 rounded hover:bg-white transition-colors text-slate-500"
              title={refreshRate === 0 ? "Resume live sync" : "Pause live sync"}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  refreshRate > 0 ? "animate-spin text-indigo-500" : "text-slate-400"
                }`}
                style={{ animationDuration: "4s" }}
              />
            </button>
            <select
              value={refreshRate}
              onChange={(e) => setRefreshRate(Number(e.target.value))}
              className="bg-transparent text-[11px] font-mono text-slate-600 focus:outline-none pr-1 cursor-pointer"
            >
              <option value={1000}>1s (Realtime)</option>
              <option value={2000}>2s (Standard)</option>
              <option value={5000}>5s</option>
              <option value={0}>Paused</option>
            </select>
          </div>

          {/* AI Copilot toggle */}
          <button
            onClick={onToggleChat}
            className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium ${
              isChatOpen
                ? "bg-indigo-600 text-white shadow-sm"
                : "hover:bg-slate-100 text-slate-600 border border-slate-200"
            }`}
            title="Open Synexis AI Copilot"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden md:inline">AI Copilot</span>
          </button>

          {/* Bell */}
          <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
            <Bell className="w-5 h-5" />
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold shadow-sm">
                {alertCount}
              </span>
            )}
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 ml-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              A
            </div>
            <div className="hidden md:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">Admin</div>
              <div className="text-[10px] text-emerald-600 font-medium leading-tight">SRE Operator</div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
          </div>
        </div>
      </div>
    </header>
  );
};
