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
  color?: string; // e.g. "#4f46e5", "#6366f1", "#0284c7", "#10b981"
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
  color = "#4f46e5",
  secondaryColor = "#8b5cf6",
  primaryLabel = "Primary",
  secondaryLabel = "Secondary",
  height = 200,
  maxVal = 100,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-52 bg-white border border-slate-200 rounded-xl text-slate-400 text-xs font-mono">
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

  // Area fill path for primary value
  const areaPath =
    `M ${paddingX},${height - paddingY} ` +
    data.map((d, i) => `L ${getX(i)},${getY(d.value)}`).join(" ") +
    ` L ${getX(data.length - 1)},${height - paddingY} Z`;

  const hoveredPoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : data[data.length - 1];

  const uniqueGradId = `grad-${title.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
      {/* Header & Legends */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
            {title}
          </h3>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {primaryLabel}: <strong className="text-slate-900 font-mono font-bold">{hoveredPoint?.value?.toFixed(1)}{unit}</strong>
          </span>
          {secondaryPoints && (
            <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
              {secondaryLabel}: <strong className="text-slate-900 font-mono font-bold">{hoveredPoint?.secondaryValue?.toFixed(1)}{unit}</strong>
            </span>
          )}
          <span className="text-[10px] font-mono text-slate-400 ml-2">
            {hoveredPoint?.timestamp}
          </span>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative overflow-hidden">
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
            <linearGradient id={uniqueGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.12" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
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
                  stroke="#E2E8F0"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#94A3B8"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="500"
                >
                  {Math.round(pct * maxVal)}
                </text>
              </g>
            );
          })}

          {/* Soft Gradient Area Fill */}
          <path d={areaPath} fill={`url(#${uniqueGradId})`} />

          {/* Primary Line Path */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={primaryPoints}
          />

          {/* Secondary Line Path */}
          {secondaryPoints && (
            <polyline
              fill="none"
              stroke={secondaryColor}
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={secondaryPoints}
            />
          )}

          {/* Hover Crosshair Guide */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={paddingY}
                x2={getX(hoverIndex)}
                y2={height - paddingY}
                stroke="#6366F1"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(hoveredPoint.value)}
                r="4"
                fill={color}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              {hoveredPoint.secondaryValue !== undefined && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(hoveredPoint.secondaryValue)}
                  r="4"
                  fill={secondaryColor}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              )}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
