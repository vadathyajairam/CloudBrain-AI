"use client";

import React, { useState } from "react";

interface DataPoint {
  timestamp: string;
  value: number;
  secondaryValue?: number;
}

interface LiveChartProps {
  data: DataPoint[];
  title: string;
  unit?: string;
  color?: string; // e.g. "#06b6d4", "#6366f1", "#f43f5e", "#10b981"
  secondaryColor?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  height?: number;
  maxVal?: number;
}

export const LiveChart: React.FC<LiveChartProps> = ({
  data,
  title,
  unit = "%",
  color = "#06b6d4",
  secondaryColor = "#6366f1",
  primaryLabel = "Primary",
  secondaryLabel = "Secondary",
  height = 180,
  maxVal = 100,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-44 text-slate-500 text-xs font-mono">
        Awaiting telemetry data stream...
      </div>
    );
  }

  const width = 600;
  const paddingX = 40;
  const paddingY = 25;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Scale calculations
  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(maxVal, val));
    return height - paddingY - (clamped / maxVal) * chartH;
  };

  const getX = (idx: number) => {
    if (data.length <= 1) return paddingX + chartW / 2;
    return paddingX + (idx / (data.length - 1)) * chartW;
  };

  // Generate SVG paths
  const generatePath = (valKey: "value" | "secondaryValue") => {
    const points = data.map((d, i) => {
      const v = valKey === "value" ? d.value : d.secondaryValue ?? 0;
      return `${getX(i)},${getY(v)}`;
    });
    return points.join(" ");
  };

  const primaryPoints = generatePath("value");
  const secondaryPoints = data[0]?.secondaryValue !== undefined ? generatePath("secondaryValue") : null;

  // Area fill path
  const areaPath = `M ${paddingX},${height - paddingY} ` +
    data.map((d, i) => `L ${getX(i)},${getY(d.value)}`).join(" ") +
    ` L ${getX(data.length - 1)},${height - paddingY} Z`;

  const hoveredPoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : data[data.length - 1];

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-medium text-slate-300 tracking-wide uppercase">{title}</span>
          <div className="flex items-center space-x-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {primaryLabel}: <strong className="text-white font-mono">{hoveredPoint?.value?.toFixed(1)}{unit}</strong>
            </span>
            {secondaryPoints && (
              <span className="inline-flex items-center gap-1.5 text-slate-400 ml-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryColor }} />
                {secondaryLabel}: <strong className="text-white font-mono">{hoveredPoint?.secondaryValue?.toFixed(1)}{unit}</strong>
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          {hoveredPoint?.timestamp}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-lg bg-slate-950/60 border border-slate-800/80 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const normX = mouseX / rect.width;
            const idx = Math.round(normX * (data.length - 1));
            if (idx >= 0 && idx < data.length) {
              setHoverIndex(idx);
            }
          }}
        >
          <defs>
            <linearGradient id={`grad-${title.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="90%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = paddingY + chartH * (1 - pct);
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {Math.round(pct * maxVal)}
                </text>
              </g>
            );
          })}

          {/* Fill gradient */}
          <path d={areaPath} fill={`url(#grad-${title.replace(/\s+/g, "")})`} />

          {/* Secondary Line */}
          {secondaryPoints && (
            <polyline
              fill="none"
              stroke={secondaryColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 2"
              points={secondaryPoints}
            />
          )}

          {/* Primary Line */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={primaryPoints}
          />

          {/* Hover indicator line & dot */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={paddingY}
                x2={getX(hoverIndex)}
                y2={height - paddingY}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(data[hoverIndex].value)}
                r="4.5"
                fill={color}
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
