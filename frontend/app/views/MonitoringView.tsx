"use client";

import React, { useState } from "react";
import { Cpu, MemoryStick, HardDrive, Wifi, Activity } from "lucide-react";
import { SystemMetrics } from "../lib/api";
import { LiveChart } from "../components/LiveChart";
import { MetricCard } from "../components/MetricCard";

interface MonitoringViewProps {
  metrics: SystemMetrics | null;
  history: SystemMetrics[];
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({ metrics, history }) => {
  const [timeRange, setTimeRange] = useState<string>("live");

  const cpuData = history.map((h) => ({
    timestamp: h.timestamp,
    value: h.cpu.usage_percent,
  }));

  const memData = history.map((h) => ({
    timestamp: h.timestamp,
    value: h.memory.usage_percent,
    secondaryValue: h.memory.swap_percent,
  }));

  const netData = history.map((h) => ({
    timestamp: h.timestamp,
    value: h.network.download_kbps,
    secondaryValue: h.network.upload_kbps,
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 leading-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              Live Host Telemetry & Compute Metrics
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-mono">
              Source: Local Machine (psutil)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time CPU, RAM, Disk, and Network telemetry sampled directly from host OS counters
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-white border border-slate-200 p-1 rounded-xl text-xs shadow-xs">
          {["live", "5m", "15m", "1h"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg font-mono transition-all ${
                timeRange === range
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Host CPU Usage"
          value={metrics?.cpu.usage_percent ?? 0}
          unit="%"
          subtitle={`${metrics?.cpu.physical_core_count ?? 4} Physical / ${metrics?.cpu.core_count ?? 8} Logical Cores`}
          icon={Cpu}
          color={(metrics?.cpu.usage_percent ?? 0) > 80 ? "rose" : "cyan"}
          percent={metrics?.cpu.usage_percent ?? 0}
        />
        <MetricCard
          title="Memory (RAM)"
          value={metrics?.memory.used_gb ?? 0}
          unit={`/ ${metrics?.memory.total_gb ?? 0} GB`}
          subtitle={`Available: ${metrics?.memory.available_gb ?? 0} GB`}
          icon={MemoryStick}
          color={(metrics?.memory.usage_percent ?? 0) > 85 ? "rose" : "indigo"}
          percent={metrics?.memory.usage_percent ?? 0}
        />
        <MetricCard
          title="Storage Partition"
          value={metrics?.disk.used_gb ?? 0}
          unit={`/ ${metrics?.disk.total_gb ?? 0} GB`}
          subtitle={`Free: ${metrics?.disk.free_gb ?? 0} GB (${(100 - (metrics?.disk.usage_percent ?? 0)).toFixed(0)}%)`}
          icon={HardDrive}
          color="emerald"
          percent={metrics?.disk.usage_percent ?? 0}
        />
        <MetricCard
          title="Network Bandwidth"
          value={metrics?.network.download_kbps ?? 0}
          unit="KB/s"
          subtitle={`Total Sent: ${metrics?.network.total_sent_mb ?? 0} MB`}
          icon={Wifi}
          color="amber"
          percent={Math.min(100, (metrics?.network.download_kbps ?? 0) / 10)}
        />
      </div>

      {/* Real-time SVG Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveChart
          title="Host Processor Telemetry (Real-time %)"
          data={cpuData}
          color="#06b6d4"
          maxVal={100}
          unit="%"
          primaryLabel="CPU %"
        />
        <LiveChart
          title="Memory Utilization & Dynamic Swap Rate"
          data={memData}
          color="#6366f1"
          secondaryColor="#f43f5e"
          maxVal={100}
          unit="%"
          primaryLabel="RAM %"
          secondaryLabel="Swap %"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <LiveChart
          title="Network Interface Activity (Inbound / Outbound KB/s)"
          data={netData}
          color="#10b981"
          secondaryColor="#f59e0b"
          maxVal={1000}
          unit="KB/s"
          primaryLabel="Download"
          secondaryLabel="Upload"
        />
      </div>
    </div>
  );
};
