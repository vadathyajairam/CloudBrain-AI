"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Code, 
  Play, 
  FileText, 
  Sparkles,
  FileCode
} from "lucide-react";
import { api } from "../lib/api";

export const ConfigView: React.FC = () => {
  const [fileType, setFileType] = useState<string>("docker-compose");
  const [content, setContent] = useState<string>("");
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [samples, setSamples] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const res = await api.getSampleConfigs();
        if (res.samples) {
          setSamples(res.samples);
          setContent(res.samples.docker_compose_vulnerable || "");
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchSamples();
  }, []);

  const handleAudit = async (customContent?: string, customType?: string) => {
    const textToAudit = customContent ?? content;
    const typeToAudit = customType ?? fileType;
    if (!textToAudit.trim()) return;

    setLoading(true);
    try {
      const res = await api.auditConfig(typeToAudit, textToAudit);
      setAuditResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSample = (sampleKey: string, type: string) => {
    const sampleText = samples[sampleKey] || "";
    setContent(sampleText);
    setFileType(type);
    handleAudit(sampleText, type);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Infrastructure-as-Code (IaC) & Security Auditor
          </h2>
          <p className="text-xs text-slate-400">
            Automated security, port collisions, and reliability linter for Dockerfiles, Compose, and K8s manifests
          </p>
        </div>

        {/* Quick Sample Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono">Load Sample:</span>
          <button
            onClick={() => handleSelectSample("docker_compose_vulnerable", "docker-compose")}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 text-xs font-mono transition-colors"
          >
            Compose (Vulnerable)
          </button>
          <button
            onClick={() => handleSelectSample("dockerfile_vulnerable", "dockerfile")}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800 text-xs font-mono transition-colors"
          >
            Dockerfile (Root & Key)
          </button>
          <button
            onClick={() => handleSelectSample("k8s_manifest_vulnerable", "k8s")}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 text-xs font-mono transition-colors"
          >
            K8s (No Limits)
          </button>
        </div>
      </div>

      {/* Editor & Audit Results Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
                <Code className="w-4 h-4 text-cyan-400" />
                Config Manifest Code
              </span>

              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1 focus:outline-none font-mono"
              >
                <option value="docker-compose">docker-compose.yml</option>
                <option value="dockerfile">Dockerfile</option>
                <option value="k8s">kubernetes.yaml</option>
                <option value="env">.env config</option>
              </select>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or write your Dockerfile, docker-compose.yml, or K8s YAML here..."
              rows={16}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-cyan-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
            />

            <button
              onClick={() => handleAudit()}
              disabled={loading || !content.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-indigo-950/40 transition-all flex items-center justify-center gap-2"
            >
              <Play className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Scanning Manifest..." : "Audit & Lint Manifest"}</span>
            </button>
          </div>
        </div>

        {/* Audit Results Panel (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {auditResult ? (
            <div className="space-y-4">
              {/* Scorecard Banner */}
              <div className={`p-5 rounded-2xl border backdrop-blur-xl flex items-center justify-between ${
                auditResult.status === "PASS"
                  ? "bg-emerald-950/30 border-emerald-500/40 shadow-xl shadow-emerald-950/20"
                  : "bg-slate-900/80 border-rose-500/40 shadow-xl shadow-rose-950/20"
              }`}>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold font-mono uppercase text-slate-400">
                    Security & Reliability Score
                  </span>
                  <div className="flex items-baseline space-x-3">
                    <span className="text-3xl font-bold font-mono text-white">
                      {auditResult.score} / 100
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-md font-mono font-bold text-xs ${
                      auditResult.grade === "A+" || auditResult.grade === "A"
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        : "bg-rose-950 text-rose-300 border border-rose-800"
                    }`}>
                      Grade {auditResult.grade}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 pt-0.5">
                    Found {auditResult.summary.total_issues} issues ({auditResult.summary.critical} Critical, {auditResult.summary.high} High, {auditResult.summary.medium} Medium)
                  </p>
                </div>

                <div className="text-right">
                  <span className={`px-3 py-1 text-xs font-bold rounded-lg font-mono uppercase ${
                    auditResult.status === "PASS"
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-600 text-white"
                  }`}>
                    {auditResult.status === "PASS" ? "PASSED" : "FAILED AUDIT"}
                  </span>
                </div>
              </div>

              {/* Issues List */}
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {auditResult.issues.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-emerald-400 text-xs">
                    ✓ Clean configuration! No security flaws or syntax vulnerabilities detected.
                  </div>
                ) : (
                  auditResult.issues.map((iss: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.2 text-[9px] font-mono font-bold rounded ${
                            iss.severity === "CRITICAL"
                              ? "bg-rose-950 text-rose-300 border border-rose-800"
                              : iss.severity === "HIGH"
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : "bg-slate-900 text-slate-400 border border-slate-800"
                          }`}>
                            {iss.severity}
                          </span>
                          <span className="font-semibold text-white">
                            {iss.title}
                          </span>
                        </div>
                        {iss.line && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Line {iss.line}
                          </span>
                        )}
                      </div>

                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {iss.detail}
                      </p>

                      <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-indigo-300 font-mono">
                        <strong>Fix: </strong> {iss.recommendation}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-500 text-xs font-mono">
              Click &quot;Audit &amp; Lint Manifest&quot; to scan for security leaks, port conflicts, and reliability issues.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
