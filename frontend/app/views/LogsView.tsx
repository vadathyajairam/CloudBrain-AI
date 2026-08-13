"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Search, 
  Filter, 
  BrainCircuit, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Copy,
  Check
} from "lucide-react";
import { LogEntry, api } from "../lib/api";

interface LogsViewProps {
  onAnalyzeWithAI: (contextText: string) => void;
}

export const LogsView: React.FC<LogsViewProps> = ({ onAnalyzeWithAI }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedService, setSelectedService] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  const [stats, setStats] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const data = await api.getLogs({
        service: selectedService,
        level: selectedLevel,
        search: searchQuery,
        limit: 120,
      });
      if (data.logs) {
        setLogs(data.logs);
      }
      const statsData = await api.getLogStats();
      setStats(statsData);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (!isAutoRefresh) return;
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [selectedService, selectedLevel, searchQuery, isAutoRefresh]);

  const handleClear = async () => {
    await api.clearLogs();
    await fetchLogs();
  };

  const handleCopyLog = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTriggerAI = () => {
    const errorLogs = logs.filter((l) => l.level === "ERROR" || l.level === "CRITICAL");
    const summary = errorLogs.length > 0
      ? errorLogs.map((l) => `[${l.timestamp}] [${l.service}] ${l.level}: ${l.message}`).join("\n")
      : logs.slice(-20).map((l) => `[${l.timestamp}] [${l.service}] ${l.level}: ${l.message}`).join("\n");

    onAnalyzeWithAI(summary);
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto animate-fadeIn">
      {/* Header & AI Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 leading-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Intelligent Log Explorer & Anomaly Detector
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-mono">
              Live Buffer Streaming
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time log ingestion across microservices with automated error clustering
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleTriggerAI}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Analyze with AI</span>
          </button>

          <button
            onClick={handleClear}
            title="Clear buffer"
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 border border-slate-200 transition-colors shadow-2xs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Burst Notification Banner if errors detected */}
      {stats && stats.recent_error_count > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-3 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="text-rose-900 font-semibold">
              High Anomaly Rate: <strong className="font-mono text-rose-700">{stats.recent_error_count} error events</strong> detected in recent stream.
            </span>
          </div>
          <button
            onClick={handleTriggerAI}
            className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline font-mono"
          >
            Run Root Cause Diagnostic →
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs by keyword, trace ID, or error message..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
          />
        </div>

        {/* Service filter */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] text-slate-500 font-mono">Service:</span>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer font-mono"
          >
            <option value="all">All Services</option>
            <option value="backend">backend</option>
            <option value="frontend">frontend</option>
            <option value="database">database</option>
            <option value="redis">redis</option>
            <option value="worker">worker</option>
          </select>
        </div>

        {/* Level filter */}
        <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 p-1 rounded-lg text-xs font-mono">
          {["ALL", "INFO", "WARN", "ERROR", "CRITICAL"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                selectedLevel === lvl
                  ? lvl === "ERROR" || lvl === "CRITICAL"
                    ? "bg-rose-600 text-white"
                    : lvl === "WARN"
                    ? "bg-amber-600 text-white"
                    : "bg-indigo-600 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Auto stream toggle */}
        <button
          onClick={() => setIsAutoRefresh(!isAutoRefresh)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
            isAutoRefresh
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-slate-50 border-slate-200 text-slate-500"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isAutoRefresh ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
          <span>{isAutoRefresh ? "Live Stream" : "Paused"}</span>
        </button>
      </div>

      {/* Logs Table / Console View */}
      <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-3 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span>Displaying {logs.length} log events</span>
          <span>Time: UTC / Host Local</span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-800/60 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs font-mono">
              No matching log records found for the applied filters.
            </div>
          ) : (
            logs.map((log) => {
              const isError = log.level === "ERROR" || log.level === "CRITICAL";
              const isWarn = log.level === "WARN";

              return (
                <div
                  key={log.id}
                  className={`p-2.5 flex items-start justify-between group hover:bg-slate-900/80 transition-colors ${
                    isError
                      ? "bg-rose-950/20 text-rose-200"
                      : isWarn
                      ? "bg-amber-950/15 text-amber-200"
                      : "text-slate-300"
                  }`}
                >
                  <div className="flex items-start space-x-3 overflow-hidden">
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {log.timestamp}
                    </span>

                    <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded shrink-0 ${
                      isError
                        ? "bg-rose-950 text-rose-400 border border-rose-800"
                        : isWarn
                        ? "bg-amber-950 text-amber-400 border border-amber-800"
                        : "bg-slate-900 text-slate-400 border border-slate-800"
                    }`}>
                      {log.level}
                    </span>

                    <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-900 text-cyan-400 border border-slate-800 shrink-0">
                      {log.service}
                    </span>

                    <span className="truncate leading-relaxed select-text">
                      {log.message}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyLog(log.message, log.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-slate-300 transition-opacity"
                    title="Copy message"
                  >
                    {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
