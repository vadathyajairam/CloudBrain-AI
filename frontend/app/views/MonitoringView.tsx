"use client";

import React, { useState } from "react";
import { Cpu, MemoryStick, HardDrive, Wifi, Server, Layers } from "lucide-react";
import { SystemMetrics } from "../lib/api";
import { LiveChart } from "../components/LiveChart";
import { MetricCard } from "../components/MetricCard";

interface MonitoringViewProps {
  metrics: SystemMetrics | null;
  history: SystemMetrics[];
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({ metrics, history }) => {
  const [timeRange, setTimeRange] = useState<string>("live");

  const cpuSeries = history.map((h) => ({
    timestamp: h.timestamp,
    value: h.cpu.usage_percent,
  }));

  const memSeries = history.map((h) => ({
    timestamp: h.timestamp,
    value: h.memory.usage_percent,
    secondaryValue: h.memory.swap_percent,
  }));

  const netSeries = history.map((h) => ({
    timestamp: h.timestamp,
    value: h.network.download_kbps,
    secondaryValue: h.network.upload_kbps,
  }));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            Infrastructure Telemetry & Metrics Engine
          </h2>
          <p className="text-xs text-slate-400">
            Real-time multi-dimensional timeseries metrics gathered via high-precision OS collectors
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          {["live", "5m", "15m", "1h"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg font-mono transition-all ${
                timeRange === range
                  ? "bg-indigo-600 text-white shadow-md font-semibold"
                  : "text-slate-400 hover:text-white"
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
          title="Storage Partition (C:\\)"
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
          badge="Live I/O"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <LiveChart
            data={cpuSeries}
            title="CPU Utilization History"
            color="#06b6d4"
            primaryLabel="CPU Total"
            unit="%"
            height={200}
            maxVal={100}
          />
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <LiveChart
            data={memSeries}
            title="Virtual Memory & Swap Pressure"
            color="#818cf8"
            secondaryColor="#f43f5e"
            primaryLabel="RAM Usage"
            secondaryLabel="Swap Pressure"
            unit="%"
            height={200}
            maxVal={100}
          />
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl lg:col-span-2">
          <LiveChart
            data={netSeries}
            title="Network Traffic Ingress / Egress Rate"
            color="#10b981"
            secondaryColor="#f59e0b"
            primaryLabel="Download (Ingress)"
            secondaryLabel="Upload (Egress)"
            unit=" KB/s"
            height={200}
            maxVal={600}
          />
        </div>
      </div>

      {/* Per-Core CPU Breakdown */}
      {metrics?.cpu.cores_usage && metrics.cpu.cores_usage.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Logical CPU Core Distribution ({metrics.cpu.cores_usage.length} Cores)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
            {metrics.cpu.cores_usage.map((usage, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Core #{idx}</span>
                  <span className={usage > 80 ? "text-rose-400 font-bold" : "text-slate-300"}>
                    {usage}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      usage > 80 ? "bg-rose-500" : usage > 50 ? "bg-amber-500" : "bg-cyan-500"
                    }`}
                    style={{ width: `${usage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
