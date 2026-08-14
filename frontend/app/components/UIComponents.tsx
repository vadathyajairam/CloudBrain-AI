"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, ShieldCheck, XCircle, ChevronRight } from "lucide-react";

// ── Card Container ─────────────────────────────────────────────────────────
export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({ children, className = "", padding = "md" }) => {
  const paddingMap = {
    none: "p-0",
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  };
  return (
    <div className={`bg-white border border-slate-200/90 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${paddingMap[padding]} ${className}`}>
      {children}
    </div>
  );
};

// ── Generic Pill Badge ──────────────────────────────────────────────────────
export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "indigo" | "emerald" | "amber" | "rose" | "sky" | "slate";
  size?: "xs" | "sm";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "sm",
  className = "",
}) => {
  const variantMap = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold",
    amber: "bg-amber-50 text-amber-700 border-amber-200 font-semibold",
    rose: "bg-rose-50 text-rose-700 border-rose-200 font-semibold",
    sky: "bg-sky-50 text-sky-700 border-sky-200 font-semibold",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const sizeMap = {
    xs: "text-[10px] px-1.5 py-0.5 rounded font-mono",
    sm: "text-xs px-2.5 py-0.5 rounded-full font-medium",
  };

  return (
    <span className={`inline-flex items-center gap-1 border ${variantMap[variant]} ${sizeMap[size]} ${className}`}>
      {children}
    </span>
  );
};

// ── Semantic Status Badge ────────────────────────────────────────────────────
export type StatusType =
  | "HEALTHY"
  | "DEGRADED"
  | "CRITICAL"
  | "ONLINE"
  | "OFFLINE"
  | "OPERATIONAL"
  | "READY"
  | "ENFORCED"
  | "DETECTED"
  | "INVESTIGATING"
  | "REMEDIATING"
  | "RESOLVED"
  | "CLOSED"
  | "PENDING"
  | "APPROVED"
  | "SUCCESS"
  | "FAILED"
  | "RUNNING"
  | "STOPPED";

export const StatusBadge: React.FC<{ status: StatusType | string; className?: string }> = ({
  status,
  className = "",
}) => {
  const normalized = (status || "").toUpperCase();

  if (["HEALTHY", "ONLINE", "OPERATIONAL", "READY", "SUCCESS", "RESOLVED", "RUNNING"].includes(normalized)) {
    return (
      <Badge variant="emerald" size="xs" className={className}>
        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>{normalized}</span>
      </Badge>
    );
  }

  if (["DEGRADED", "WARNING", "PENDING", "INVESTIGATING", "REMEDIATING", "DETECTED"].includes(normalized)) {
    return (
      <Badge variant="amber" size="xs" className={className}>
        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
        <span>{normalized}</span>
      </Badge>
    );
  }

  if (["CRITICAL", "FAILED", "OFFLINE", "STOPPED", "DEAD"].includes(normalized)) {
    return (
      <Badge variant="rose" size="xs" className={className}>
        <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
        <span>{normalized}</span>
      </Badge>
    );
  }

  return (
    <Badge variant="indigo" size="xs" className={className}>
      <Info className="w-3 h-3 text-indigo-600 shrink-0" />
      <span>{normalized}</span>
    </Badge>
  );
};

// ── Section Header ──────────────────────────────────────────────────────────
export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  action,
  className = "",
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 ${className}`}>
      <div className="flex items-start sm:items-center gap-2.5">
        {Icon && (
          <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
};

// ── Action Button ───────────────────────────────────────────────────────────
export interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  icon?: React.ElementType;
  isLoading?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  isLoading = false,
  className = "",
  disabled,
  ...props
}) => {
  const variantMap = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 active:bg-indigo-800",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 active:bg-slate-300",
    outline: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm active:bg-slate-100",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600 active:bg-slate-200",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20 active:bg-rose-800",
  };

  const sizeMap = {
    sm: "text-xs px-3 py-1.5 rounded-lg font-medium gap-1.5",
    md: "text-xs px-4 py-2 rounded-lg font-medium gap-2",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantMap[variant]} ${sizeMap[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
};

// ── Infrastructure Data Source Badge ────────────────────────────────────────
export interface DataSourceBadgeProps {
  name: string;
  status: "connected" | "disconnected" | "disabled" | "not_connected";
  icon?: React.ElementType;
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({ name, status, icon: Icon }) => {
  const isOk = status === "connected";
  const isOff = status === "disabled" || status === "not_connected";

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border font-medium transition-all ${
        isOk
          ? "bg-emerald-50/80 text-emerald-700 border-emerald-200/80"
          : isOff
          ? "bg-slate-50 text-slate-400 border-slate-200/60 opacity-75"
          : "bg-amber-50 text-amber-700 border-amber-200"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isOk ? "bg-emerald-500 animate-pulse-subtle" : "bg-slate-300"}`} />
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span className="font-semibold text-slate-800">{name}</span>
      <span className="text-[10px] font-mono text-slate-500 uppercase">
        {isOk ? "Connected" : status === "disabled" ? "Disabled" : "Not Connected"}
      </span>
    </div>
  );
};

// ── Empty State Component ────────────────────────────────────────────────────
export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  codeSnippet?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Info,
  action,
  codeSnippet,
  className = "",
}) => {
  return (
    <div className={`p-8 text-center bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center ${className}`}>
      <div className="p-3 bg-slate-100 text-slate-500 rounded-full mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 max-w-md mt-1 mb-4 leading-relaxed">{description}</p>
      {codeSnippet && (
        <div className="w-full max-w-sm bg-slate-900 text-slate-200 p-3 rounded-lg text-left text-xs font-mono mb-4 border border-slate-800">
          <span className="text-slate-500 select-none">$ </span>
          {codeSnippet}
        </div>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};
