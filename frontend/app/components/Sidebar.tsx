"use client";

import React from "react";
import { SynexisLogo } from "./SynexisLogo";
import {
  LayoutDashboard,
  Activity,
  FileText,
  BrainCircuit,
  AlertOctagon,
  Boxes,
  Database,
  ShieldCheck,
  Wrench,
  Flame,
  Bot,
  BookOpen,
  CheckCircle2,
  Cpu,
  Cloud,
  Sparkles,
  Shield,
  Layers,
} from "lucide-react";

export type NavTab =
  | "dashboard"
  | "monitoring"
  | "logs"
  | "ai_rca"
  | "incidents"
  | "containers"
  | "kubernetes"
  | "simulation"
  | "data_sources"
  | "artifacts"
  | "config"
  | "remediation"
  | "chaos"
  | "assistant";

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  activeIncidentsCount: number;
  activeChaos: string | null;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  group: string;
  badge?: string | number;
  badgeColor?: string;
  tag?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeIncidentsCount,
  activeChaos,
}) => {
  const navItems: NavItem[] = [
    // Overview
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "OVERVIEW" },
    // Observability
    { id: "monitoring", label: "Host Telemetry", icon: Activity, group: "OBSERVABILITY" },
    { id: "logs", label: "Log Stream", icon: FileText, group: "OBSERVABILITY" },
    // Intelligence & RAG
    {
      id: "ai_rca",
      label: "AI Root Cause (RCA)",
      icon: BrainCircuit,
      group: "INTELLIGENCE & RAG",
      tag: "RAG",
    },
    {
      id: "incidents",
      label: "Incidents Lifecycle",
      icon: AlertOctagon,
      group: "INTELLIGENCE & RAG",
      badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined,
      badgeColor:
        activeIncidentsCount > 0
          ? "bg-rose-500 text-white font-bold animate-pulse"
          : undefined,
    },
    {
      id: "artifacts",
      label: "Config Artifacts",
      icon: BookOpen,
      group: "INTELLIGENCE & RAG",
      tag: "K8s/IaC",
    },
    // Infrastructure
    { id: "containers", label: "Docker Containers", icon: Boxes, group: "INFRASTRUCTURE" },
    { id: "kubernetes", label: "Kubernetes (Local)", icon: Cpu, group: "INFRASTRUCTURE" },
    { id: "simulation", label: "Cloud Simulation", icon: Cloud, group: "INFRASTRUCTURE" },
    { id: "data_sources", label: "Data Sources", icon: Database, group: "INFRASTRUCTURE" },
    { id: "config", label: "Config & Security", icon: ShieldCheck, group: "INFRASTRUCTURE" },
    // Operations
    { id: "remediation", label: "Remediation & Audit", icon: Wrench, group: "OPERATIONS" },
    {
      id: "chaos",
      label: "Chaos Sandbox Lab",
      icon: Flame,
      group: "OPERATIONS",
      badge: activeChaos ? "ACTIVE" : undefined,
      badgeColor: activeChaos ? "bg-rose-500 text-white font-bold" : undefined,
    },
    { id: "assistant", label: "DevOps Copilot", icon: Bot, group: "OPERATIONS" },
  ];

  const groups = Array.from(new Set(navItems.map((item) => item.group)));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 border-r border-slate-800/80 flex flex-col shrink-0 h-screen sticky top-0 z-30 select-none">
      {/* ── Header Brand Card ── */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <SynexisLogo variant="horizontal" theme="dark" size="md" showSubtitle={true} />
      </div>

      {/* ── Navigation Tree ── */}
      <div className="p-3 flex-1 overflow-y-auto space-y-4">
        {groups.map((group) => (
          <div key={group}>
            <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              {group}
            </div>
            <div className="space-y-0.5">
              {navItems
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/40 font-semibold"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? "text-white" : "text-slate-400"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.tag && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                              isActive
                                ? "bg-indigo-700 text-indigo-100"
                                : "bg-slate-800 text-cyan-400 border border-slate-700/60"
                            }`}
                          >
                            {item.tag}
                          </span>
                        )}
                        {item.badge !== undefined && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              item.badgeColor || "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom Engine Status Footer ── */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Engine Status
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">
              OPERATIONAL
            </span>
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between">
            <span>RAG Retriever:</span>
            <span className="text-cyan-400 font-mono font-semibold">READY</span>
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between">
            <span>Safety Gate:</span>
            <span className="text-indigo-400 font-mono font-semibold">ENFORCED</span>
          </div>
          <div className="pt-1 border-t border-slate-800 text-[9px] text-slate-500 text-center font-mono">
            Health Check: <span className="text-slate-400">Live Telemetry</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
