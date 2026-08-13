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
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 leading-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Infrastructure-as-Code (IaC) & Security Auditor
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-mono">
              Static Rule Linter
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated security, port collisions, and reliability linter for Dockerfiles, Compose, and K8s manifests
          </p>
        </div>

        {/* Quick Sample Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono">Load Sample:</span>
          <button
            onClick={() => handleSelectSample("docker_compose_vulnerable", "docker-compose")}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-mono transition-colors shadow-2xs"
          >
            Compose (Vulnerable)
          </button>
          <button
            onClick={() => handleSelectSample("dockerfile_vulnerable", "dockerfile")}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-mono transition-colors shadow-2xs"
          >
            Dockerfile (Root & Key)
          </button>
          <button
            onClick={() => handleSelectSample("k8s_manifest_vulnerable", "k8s")}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-mono transition-colors shadow-2xs"
          >
            K8s (No Limits)
          </button>
        </div>
      </div>

      {/* Editor & Audit Results Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono">
                <Code className="w-4 h-4 text-indigo-600" />
                Config Manifest Code
              </span>

              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1 focus:outline-none font-mono cursor-pointer"
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-cyan-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none shadow-inner"
            />

            <button
              onClick={() => handleAudit()}
              disabled={loading || !content.trim()}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
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
              <div className={`p-5 rounded-xl border bg-white shadow-sm flex items-center justify-between ${
                auditResult.status === "PASS"
                  ? "border-emerald-200"
                  : "border-rose-200"
              }`}>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold font-mono uppercase text-slate-400">
                    Security & Reliability Score
                  </span>
                  <div className="flex items-baseline space-x-3">
                    <span className="text-3xl font-bold font-mono text-slate-900">
                      {auditResult.score} / 100
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-md font-mono font-bold text-xs ${
                      auditResult.grade === "A+" || auditResult.grade === "A"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                      Grade {auditResult.grade}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 pt-0.5">
                    Found {auditResult.summary.total_issues} issues ({auditResult.summary.critical} Critical, {auditResult.summary.high} High, {auditResult.summary.medium} Medium)
                  </p>
                </div>

                <div className="text-right">
                  <span className={`px-3 py-1 text-xs font-bold rounded-lg font-mono uppercase ${
                    auditResult.status === "PASS"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}>
                    {auditResult.status === "PASS" ? "PASSED" : "FAILED AUDIT"}
                  </span>
                </div>
              </div>

              {/* Issues List */}
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {auditResult.issues.length === 0 ? (
                  <div className="p-8 rounded-xl bg-white border border-emerald-200 text-center text-emerald-700 text-xs shadow-sm">
                    ✓ Clean configuration! No security flaws or syntax vulnerabilities detected.
                  </div>
                ) : (
                  auditResult.issues.map((iss: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                            iss.severity === "CRITICAL"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : iss.severity === "HIGH"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}>
                            {iss.severity}
                          </span>
                          <span className="font-bold text-slate-900">
                            {iss.title}
                          </span>
                        </div>
                        {iss.line && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Line {iss.line}
                          </span>
                        )}
                      </div>

                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {iss.detail}
                      </p>

                      <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-[11px] text-indigo-900 font-mono">
                        <strong>Fix Recommendation: </strong> {iss.recommendation}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-xl bg-white border border-slate-200 shadow-sm text-center text-slate-500 text-xs font-mono">
              Click &quot;Audit &amp; Lint Manifest&quot; to scan for security leaks, port conflicts, and reliability issues.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
