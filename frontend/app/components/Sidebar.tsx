"use client";

import React from "react";
import {
  LayoutDashboard,
  Activity,
  FileText,
  GitBranch,
  BrainCircuit,
  AlertOctagon,
  Boxes,
  Server,
  Cloud,
  ShieldCheck,
  Rocket,
  Wrench,
  Flame,
  Bot,
  ChevronLeft,
} from "lucide-react";

export type NavTab =
  | "dashboard"
  | "monitoring"
  | "logs"
  | "traces"
  | "ai_rca"
  | "incidents"
  | "containers"
  | "kubernetes"
  | "cloud_services"
  | "config"
  | "deployments"
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeIncidentsCount,
  activeChaos,
}) => {
  const navItems: NavItem[] = [
    // Main
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "main" },
    // Observability
    { id: "monitoring", label: "Monitoring", icon: Activity, group: "Observability" },
    { id: "logs", label: "Log Explorer", icon: FileText, group: "Observability" },
    { id: "traces", label: "Traces", icon: GitBranch, group: "Observability" },
    // Intelligence
    {
      id: "ai_rca",
      label: "AI Root Cause (RCA)",
      icon: BrainCircuit,
      group: "Intelligence",
    },
    {
      id: "incidents",
      label: "Incidents",
      icon: AlertOctagon,
      group: "Intelligence",
      badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined,
      badgeColor:
        activeIncidentsCount > 0
          ? "bg-rose-100 text-rose-600 font-bold"
          : undefined,
    },
    // Infrastructure
    { id: "containers", label: "Containers & Docker", icon: Boxes, group: "Infrastructure" },
    { id: "kubernetes", label: "Kubernetes", icon: Server, group: "Infrastructure" },
    { id: "cloud_services", label: "Cloud Services", icon: Cloud, group: "Infrastructure" },
    { id: "config", label: "Config & Security", icon: ShieldCheck, group: "Infrastructure" },
    // Operations
    { id: "deployments", label: "Deployments", icon: Rocket, group: "Operations" },
    { id: "remediation", label: "Remediation Console", icon: Wrench, group: "Operations" },
    {
      id: "chaos",
      label: "Chaos Sandbox",
      icon: Flame,
      group: "Operations",
      badge: activeChaos ? "ACTIVE" : "NEW",
      badgeColor: activeChaos
        ? "bg-rose-100 text-rose-600 animate-pulse"
        : "bg-blue-100 text-blue-600",
    },
    // Assistant
    { id: "assistant", label: "AI DevOps Copilot", icon: Bot, group: "Assistant" },
  ];

  const groups = [
    { id: "main", label: null },
    { id: "Observability", label: "OBSERVABILITY" },
    { id: "Intelligence", label: "INTELLIGENCE" },
    { id: "Infrastructure", label: "INFRASTRUCTURE" },
    { id: "Operations", label: "OPERATIONS" },
    { id: "Assistant", label: "ASSISTANT" },
  ];

  return (
    <aside className="w-64 min-h-[calc(100vh-61px)] border-r border-slate-200 bg-white p-3 flex flex-col justify-between shrink-0 overflow-y-auto">
      <div className="space-y-0.5">
        {groups.map((grp) => {
          const items = navItems.filter((i) => i.group === grp.id);
          if (items.length === 0) return null;

          return (
            <div key={grp.id} className={grp.label ? "pt-4" : ""}>
              {grp.label && (
                <span className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 block mb-1">
                  {grp.label}
                </span>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive
                              ? "text-indigo-600"
                              : "text-slate-400 group-hover:text-slate-600"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-full shrink-0 ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className="mt-6 space-y-2">
        {/* System Status */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <div>
            <div className="text-xs font-semibold text-slate-700 leading-tight">System Status</div>
            <div className="text-[10px] text-slate-500">All Systems Operational</div>
          </div>
        </div>

        {/* Collapse */}
        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span>Collapse</span>
        </button>
      </div>
    </aside>
  );
};
