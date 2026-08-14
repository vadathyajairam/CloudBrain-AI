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
  color = "indigo",
  percent,
  badge,
}) => {
  const colorMap = {
    cyan: {
      border: "border-slate-200 hover:border-cyan-300",
      bgIcon: "bg-cyan-50 text-cyan-600 border-cyan-100",
      bar: "bg-cyan-500",
      text: "text-cyan-600",
    },
    indigo: {
      border: "border-slate-200 hover:border-indigo-300",
      bgIcon: "bg-indigo-50 text-indigo-600 border-indigo-100",
      bar: "bg-indigo-600",
      text: "text-indigo-600",
    },
    emerald: {
      border: "border-slate-200 hover:border-emerald-300",
      bgIcon: "bg-emerald-50 text-emerald-600 border-emerald-100",
      bar: "bg-emerald-500",
      text: "text-emerald-600",
    },
    amber: {
      border: "border-slate-200 hover:border-amber-300",
      bgIcon: "bg-amber-50 text-amber-600 border-amber-100",
      bar: "bg-amber-500",
      text: "text-amber-600",
    },
    rose: {
      border: "border-slate-200 hover:border-rose-300",
      bgIcon: "bg-rose-50 text-rose-600 border-rose-100",
      bar: "bg-rose-500",
      text: "text-rose-600",
    },
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div
      className={`p-5 rounded-xl bg-white border ${scheme.border} shadow-2xs transition-all hover:shadow-md flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-500 tracking-wider uppercase font-sans">
          {title}
        </span>
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-lg border ${scheme.bgIcon}`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="my-1">
        <div className="flex items-baseline space-x-1.5">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-semibold text-slate-500 font-mono">
              {unit}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 font-medium mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {percent !== undefined && (
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Utilization</span>
            <span className="font-mono font-bold text-slate-700">{Math.round(percent)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scheme.bar}`}
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
