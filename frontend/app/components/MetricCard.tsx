"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: "cyan" | "indigo" | "emerald" | "amber" | "rose";
  percent?: number;
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  color = "cyan",
  percent,
  badge,
}) => {
  const colorMap = {
    cyan: {
      border: "border-cyan-500/30 hover:border-cyan-500/50",
      bgIcon: "bg-cyan-950/60 text-cyan-400 border-cyan-800/60",
      bar: "bg-gradient-to-r from-cyan-500 to-blue-500",
      glow: "hover:shadow-cyan-950/40",
      text: "text-cyan-400"
    },
    indigo: {
      border: "border-indigo-500/30 hover:border-indigo-500/50",
      bgIcon: "bg-indigo-950/60 text-indigo-400 border-indigo-800/60",
      bar: "bg-gradient-to-r from-indigo-500 to-violet-500",
      glow: "hover:shadow-indigo-950/40",
      text: "text-indigo-400"
    },
    emerald: {
      border: "border-emerald-500/30 hover:border-emerald-500/50",
      bgIcon: "bg-emerald-950/60 text-emerald-400 border-emerald-800/60",
      bar: "bg-gradient-to-r from-emerald-500 to-teal-500",
      glow: "hover:shadow-emerald-950/40",
      text: "text-emerald-400"
    },
    amber: {
      border: "border-amber-500/30 hover:border-amber-500/50",
      bgIcon: "bg-amber-950/60 text-amber-400 border-amber-800/60",
      bar: "bg-gradient-to-r from-amber-500 to-orange-500",
      glow: "hover:shadow-amber-950/40",
      text: "text-amber-400"
    },
    rose: {
      border: "border-rose-500/30 hover:border-rose-500/50",
      bgIcon: "bg-rose-950/60 text-rose-400 border-rose-800/60",
      bar: "bg-gradient-to-r from-rose-500 to-red-500",
      glow: "hover:shadow-rose-950/40",
      text: "text-rose-400"
    }
  };

  const scheme = colorMap[color] || colorMap.cyan;

  return (
    <div className={`p-4 rounded-xl bg-slate-900/60 border ${scheme.border} backdrop-blur-md transition-all hover:shadow-xl ${scheme.glow} flex flex-col justify-between`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
          {title}
        </span>
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg border ${scheme.bgIcon}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="my-1">
        <div className="flex items-baseline space-x-1.5">
          <span className="text-2xl font-bold tracking-tight text-white font-mono">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-medium text-slate-400 font-mono">
              {unit}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-slate-400 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {percent !== undefined && (
        <div className="mt-3 space-y-1">
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scheme.bar}`}
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Utilization</span>
            <span className={scheme.text}>{percent.toFixed(0)}%</span>
          </div>
        </div>
      )}

      {badge && (
        <div className="mt-2">
          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${scheme.bgIcon}`}>
            {badge}
          </span>
        </div>
      )}
    </div>
  );
};
