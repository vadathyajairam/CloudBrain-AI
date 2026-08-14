"use client";

import React from "react";

export interface SynexisLogoProps {
  variant?: "icon" | "full" | "horizontal";
  theme?: "dark" | "light" | "monochrome";
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
  const sizeMap = {
    sm: { icon: 24, text: "text-xs", sub: "text-[8px]" },
    md: { icon: 32, text: "text-sm", sub: "text-[10px]" },
    lg: { icon: 42, text: "text-base", sub: "text-[11px]" },
    xl: { icon: 52, text: "text-xl", sub: "text-xs" },
  };

  const dim = sizeMap[size] || sizeMap.md;
  const isDark = theme === "dark";
  const isMono = theme === "monochrome";

  // Color mappings
  const form1Color = isMono ? (isDark ? "#FFFFFF" : "#000000") : "#6366F1"; // Indigo
  const form2Color = isMono ? (isDark ? "#FFFFFF" : "#000000") : "#8B5CF6"; // Violet
  const form3Color = isMono ? (isDark ? "#FFFFFF" : "#000000") : "#38BDF8"; // Cyan
  const coreColor  = isMono ? (isDark ? "#000000" : "#FFFFFF") : (isDark ? "#FFFFFF" : "#0F172A");

  const markSvg = (
    <svg
      width={dim.icon}
      height={dim.icon}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-300 hover:scale-105"
    >
      {/* Form 1: Telemetry Ingestion Vector (Top-Left) */}
      <path
        d="M 16 20 H 46 V 46 H 30 C 22 46 16 40 16 32 Z"
        fill={form1Color}
      />

      {/* Form 2: AI Reasoning Vector (Top-Right) */}
      <path
        d="M 84 20 V 50 H 54 V 34 C 54 26 60 20 68 20 Z"
        fill={form2Color}
      />

      {/* Form 3: Automated Remediation Vector (Bottom) */}
      <path
        d="M 50 84 L 20 54 H 46 C 54 54 60 60 60 68 V 84 Z"
        fill={form3Color}
      />

      {/* Central Focal Intelligence Core (Diamond) */}
      <path
        d="M 50 38 L 62 50 L 50 62 L 38 50 Z"
        fill={coreColor}
      />
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
