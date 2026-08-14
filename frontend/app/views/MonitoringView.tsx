"use client";

import React, { useState } from "react";
import { Cpu, MemoryStick, HardDrive, Wifi, Activity, Server, ShieldCheck, Layers, Gauge } from "lucide-react";
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

  const cpuPercent = metrics?.cpu.usage_percent ?? 0;
  const memPercent = metrics?.memory.usage_percent ?? 0;
  const diskPercent = metrics?.disk.usage_percent ?? 0;
  const netDownload = metrics?.network.download_kbps ?? 0;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-600" />
              Host Telemetry
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry • Local Machine (psutil)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Live system performance and infrastructure health sampled from host OS counters
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center space-x-1.5 bg-slate-100/80 border border-slate-200 p-1 rounded-xl text-xs">
          {["live", "5m", "15m", "1h"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg font-mono transition-all cursor-pointer ${
                timeRange === range
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. Live Host Telemetry Cards ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-sans flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-indigo-600" />
            Live Host Telemetry
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Probe Rate: Every 2.0s
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <MetricCard
            title="Host CPU Usage"
            value={cpuPercent.toFixed(1)}
            unit="%"
            subtitle={`${metrics?.cpu.physical_core_count ?? 4} Physical / ${metrics?.cpu.core_count ?? 8} Logical Cores`}
            icon={Cpu}
            color={cpuPercent > 80 ? "rose" : "indigo"}
            percent={cpuPercent}
          />
          <MetricCard
            title="Memory (RAM)"
            value={metrics?.memory.used_gb?.toFixed(2) ?? 0}
            unit={`/ ${metrics?.memory.total_gb?.toFixed(2) ?? 0} GB`}
            subtitle={`Available: ${metrics?.memory.available_gb?.toFixed(2) ?? 0} GB`}
            icon={MemoryStick}
            color={memPercent > 85 ? "rose" : "indigo"}
            percent={memPercent}
          />
          <MetricCard
            title="Storage Partition"
            value={metrics?.disk.used_gb?.toFixed(2) ?? 0}
            unit={`/ ${metrics?.disk.total_gb?.toFixed(2) ?? 0} GB`}
            subtitle={`Free: ${metrics?.disk.free_gb?.toFixed(2) ?? 0} GB (${(100 - diskPercent).toFixed(0)}%)`}
            icon={HardDrive}
            color={diskPercent > 90 ? "rose" : "emerald"}
            percent={diskPercent}
          />
          <MetricCard
            title="Network Bandwidth"
            value={netDownload.toFixed(1)}
            unit="KB/s"
            subtitle={`Total Sent: ${metrics?.network.total_sent_mb?.toFixed(1) ?? 0} MB`}
            icon={Wifi}
            color="amber"
            percent={Math.min(100, (netDownload / 10))}
          />
        </div>
      </section>

      {/* ── 3. Performance Trends ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-sans flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-indigo-600" />
          Performance Trends
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LiveChart
            title="Host Processor Telemetry (Real-time %)"
            data={cpuData}
            color="#4f46e5"
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
      </section>

      {/* ── 4. Network Activity ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-sans flex items-center gap-1.5">
          <Wifi className="w-4 h-4 text-indigo-600" />
          Network Activity
        </h2>

        <div className="grid grid-cols-1 gap-6">
          <LiveChart
            title="Network Interface Activity (Inbound / Outbound KB/s)"
            data={netData}
            color="#0284c7"
            secondaryColor="#8b5cf6"
            maxVal={1000}
            unit="KB/s"
            primaryLabel="Download"
            secondaryLabel="Upload"
          />
        </div>
      </section>

      {/* ── 5. System Details ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-sans flex items-center gap-1.5">
          <Server className="w-4 h-4 text-indigo-600" />
          System Hardware & Host Environment
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                CPU Cores
              </span>
              <span className="font-mono text-indigo-600">x86_64</span>
            </div>
            <div className="text-xs text-slate-600 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Physical:</span>
                <span className="font-bold text-slate-900">{metrics?.cpu.physical_core_count ?? 4} Cores</span>
              </div>
              <div className="flex justify-between">
                <span>Logical:</span>
                <span className="font-bold text-slate-900">{metrics?.cpu.core_count ?? 8} Threads</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <MemoryStick className="w-3.5 h-3.5 text-indigo-600" />
                Memory Allocation
              </span>
              <span className="font-mono text-indigo-600">RAM</span>
            </div>
            <div className="text-xs text-slate-600 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Total Installed:</span>
                <span className="font-bold text-slate-900">{metrics?.memory.total_gb?.toFixed(1) ?? 0} GB</span>
              </div>
              <div className="flex justify-between">
                <span>Available Free:</span>
                <span className="font-bold text-slate-900">{metrics?.memory.available_gb?.toFixed(1) ?? 0} GB</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                Storage Capacity
              </span>
              <span className="font-mono text-emerald-600">Disk /</span>
            </div>
            <div className="text-xs text-slate-600 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Total Partition:</span>
                <span className="font-bold text-slate-900">{metrics?.disk.total_gb?.toFixed(1) ?? 0} GB</span>
              </div>
              <div className="flex justify-between">
                <span>Free Space:</span>
                <span className="font-bold text-slate-900">{metrics?.disk.free_gb?.toFixed(1) ?? 0} GB</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                Network Totals
              </span>
              <span className="font-mono text-amber-600">Interface</span>
            </div>
            <div className="text-xs text-slate-600 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Total Received:</span>
                <span className="font-bold text-slate-900">{metrics?.network.total_recv_mb?.toFixed(1) ?? 0} MB</span>
              </div>
              <div className="flex justify-between">
                <span>Total Sent:</span>
                <span className="font-bold text-slate-900">{metrics?.network.total_sent_mb?.toFixed(1) ?? 0} MB</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
