"use client";

import React from "react";

export interface SynexisLogoProps {
  variant?: "icon" | "full" | "horizontal";
  theme?: "dark" | "light";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showSubtitle?: boolean;
  subtitle?: string;
}

export const SynexisLogo: React.FC<SynexisLogoProps> = ({
  variant = "horizontal",
  theme = "dark",
  size = "md",
  className = "",
  showSubtitle = true,
  subtitle = "System Analysis & Automation",
}) => {
  // Size dimensions for icon
  const sizeMap = {
    sm: { icon: 24, text: "text-xs", sub: "text-[8px]" },
    md: { icon: 32, text: "text-sm", sub: "text-[10px]" },
    lg: { icon: 42, text: "text-base", sub: "text-[11px]" },
    xl: { icon: 52, text: "text-xl", sub: "text-xs" },
  };

  const dim = sizeMap[size] || sizeMap.md;
  const isDark = theme === "dark";

  const markSvg = (
    <svg
      width={dim.icon}
      height={dim.icon}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-300 hover:scale-105"
    >
      <defs>
        {/* Main Gradient */}
        <linearGradient id="synexis-grad-primary" x1="15" y1="15" x2="105" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>

        {/* Accent Glow */}
        <linearGradient id="synexis-grad-accent" x1="100" y1="20" x2="20" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>

        {/* Node Glow */}
        <radialGradient id="synexis-node-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Hexagonal Outer Node Frame */}
      <path
        d="M 60 12 L 102 36 L 102 84 L 60 108 L 18 84 L 18 36 Z"
        fill={isDark ? "#0F172A" : "#F8FAFC"}
        stroke="url(#synexis-grad-primary)"
        strokeWidth="3.5"
        strokeLinejoin="round"
        opacity="0.9"
      />

      {/* Background Micro Grid Node Tracks */}
      <path
        d="M 38 36 H 82 M 38 84 H 82 M 60 12 V 108"
        stroke={isDark ? "#334155" : "#CBD5E1"}
        strokeWidth="1.5"
        strokeDasharray="3 3"
        opacity="0.4"
      />

      {/* Primary Geometric "S" Flow Vector */}
      <path
        d="M 82 34 C 82 20, 38 20, 38 42 C 38 62, 82 58, 82 78 C 82 100, 38 100, 38 86"
        fill="none"
        stroke="url(#synexis-grad-primary)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Secondary Parallel Observability Vector */}
      <path
        d="M 76 34 C 76 26, 44 26, 44 42 C 44 56, 76 64, 76 78 C 76 94, 44 94, 44 86"
        fill="none"
        stroke="url(#synexis-grad-accent)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Intelligent Node Points */}
      <circle cx="82" cy="34" r="7" fill="url(#synexis-node-glow)" />
      <circle cx="82" cy="34" r="4.5" fill="#38BDF8" />
      <circle cx="82" cy="34" r="2" fill="#FFFFFF" />

      <circle cx="60" cy="60" r="8" fill="url(#synexis-node-glow)" />
      <circle cx="60" cy="60" r="5" fill="#6366F1" stroke="#FFFFFF" strokeWidth="1.5" />

      <circle cx="38" cy="86" r="7" fill="url(#synexis-node-glow)" />
      <circle cx="38" cy="86" r="4.5" fill="#38BDF8" />
      <circle cx="38" cy="86" r="2" fill="#FFFFFF" />
    </svg>
  );

  if (variant === "icon") {
    return <div className={`inline-flex items-center shrink-0 ${className}`}>{markSvg}</div>;
  }

  return (
    <div className={`flex items-center gap-2.5 min-w-0 w-full select-none ${className}`}>
      {markSvg}
      <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-1.5 w-full">
          <span
            className={`font-black tracking-wider uppercase font-sans ${dim.text} ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            SYNEXIS
          </span>
          <span className="text-[9px] font-mono font-semibold text-indigo-300 bg-indigo-950/90 border border-indigo-700/60 px-1.5 py-0.5 rounded shrink-0">
            v2.5
          </span>
        </div>
        {showSubtitle && (
          <span
            className={`truncate font-medium leading-tight mt-0.5 ${dim.sub} ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
            title={subtitle}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
