"use client";

import React, { useState, useEffect } from "react";
import {
  FileCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ShieldCheck,
  RefreshCw,
  Plus,
  FileText,
  Copy,
  Check,
  Eye,
  Sliders,
} from "lucide-react";
import { api } from "../lib/api";

interface ArtifactItem {
  id: string;
  artifact_type: string;
  name: string;
  format: string;
  target_service: string;
  source_incident_id?: string;
  rag_source_id?: string;
  content: string;
  description: string;
  validation_status: "VALID" | "WARNING" | "INVALID" | "PENDING";
  validation_errors: string[];
  approval_status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  created_at: string;
}

export default function ArtifactsView() {
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [showGenModal, setShowGenModal] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>("ALL");

  // Form State
  const [genType, setGenType] = useState<string>("kubernetes_manifest");
  const [genSubtype, setGenSubtype] = useState<string>("deployment");
  const [genService, setGenService] = useState<string>("synexis-postgres");
  const [genIncident, setGenIncident] = useState<string>("INC-00042");

  const fetchArtifacts = async () => {
    try {
      setLoading(true);
      const res = await api.getArtifacts();
      if (res && res.artifacts) {
        setArtifacts(res.artifacts);
        if (res.artifacts.length > 0 && !selectedArtifact) {
          setSelectedArtifact(res.artifacts[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load artifacts", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtifacts();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const res = await api.generateArtifact({
        artifact_type: genType,
        service_name: genService,
        template_subtype: genSubtype,
        incident_id: genIncident || undefined,
        rag_source_id: "RUNBOOK-DB-03",
      });
      setShowGenModal(false);
      await fetchArtifacts();
      setSelectedArtifact(res);
    } catch (e) {
      console.error("Failed to generate artifact", e);
    } finally {
      setGenerating(false);
    }
  };

  const handleValidate = async (id: string) => {
    try {
      const res = await api.validateArtifact(id);
      if (res && res.artifact) {
        setSelectedArtifact(res.artifact);
        await fetchArtifacts();
      }
    } catch (e) {
      console.error("Validation failed", e);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await api.approveArtifact(id, "sre_operator");
      if (res && res.artifact) {
        setSelectedArtifact(res.artifact);
        await fetchArtifacts();
      }
    } catch (e) {
      console.error("Approval failed", e);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await api.rejectArtifact(id, "sre_operator");
      if (res && res.artifact) {
        setSelectedArtifact(res.artifact);
        await fetchArtifacts();
      }
    } catch (e) {
      console.error("Rejection failed", e);
    }
  };

  const handleDownload = (artifact: ArtifactItem) => {
    const blob = new Blob([artifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = artifact.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredArtifacts = artifacts.filter((a) => {
    if (filterType === "ALL") return true;
    return a.artifact_type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCode className="h-5 w-5 text-indigo-600" />
            Configuration Artifacts &amp; Manifest Generator
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            AI &amp; RAG grounded generation of Kubernetes manifests, hardened Dockerfiles, and Terraform templates with syntax verification
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGenModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-sm transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Generate Artifact
          </button>
          <button
            onClick={fetchArtifacts}
            className="p-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 transition"
            title="Refresh Artifacts"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Safety Protocol Banner */}
      <div className="p-3.5 bg-slate-900 text-slate-100 rounded-lg border border-slate-800 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-emerald-400">
            Safety Control Active — No Unreviewed Automated Infrastructure Deployment
          </div>
          <div className="text-slate-300 leading-relaxed">
            All generated Kubernetes manifests, Docker configurations, and Terraform templates are statically validated and staged for operator review.
            Artifacts are never automatically applied to production clusters without explicit human approval.
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Filter by:</span>
        {["ALL", "kubernetes_manifest", "docker_config", "terraform_template"].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
              filterType === t
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t === "ALL"
              ? "All Types"
              : t === "kubernetes_manifest"
              ? "Kubernetes Manifests"
              : t === "docker_config"
              ? "Docker Configs"
              : "Terraform Templates"}
          </button>
        ))}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Artifacts List */}
        <div className="col-span-5 space-y-3">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Generated Artifacts ({filteredArtifacts.length})
          </div>

          {filteredArtifacts.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-lg text-slate-500 text-xs">
              No artifacts generated yet. Click &quot;Generate Artifact&quot; to create one.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
              {filteredArtifacts.map((art) => {
                const isSelected = selectedArtifact?.id === art.id;
                return (
                  <div
                    key={art.id}
                    onClick={() => setSelectedArtifact(art)}
                    className={`p-3.5 rounded-lg border text-xs cursor-pointer transition ${
                      isSelected
                        ? "bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-200"
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-slate-900 text-[11px] truncate max-w-[200px]">
                        {art.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                          art.validation_status === "VALID"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : art.validation_status === "WARNING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {art.validation_status}
                      </span>
                    </div>

                    <div className="text-slate-600 text-[11px] line-clamp-2 mb-2">
                      {art.description}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100">
                      <span>Target: <span className="font-mono text-slate-700">{art.target_service}</span></span>
                      <span
                        className={`font-semibold ${
                          art.approval_status === "APPROVED"
                            ? "text-emerald-600"
                            : art.approval_status === "REJECTED"
                            ? "text-rose-600"
                            : "text-amber-600"
                        }`}
                      >
                        {art.approval_status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Code Viewer & Actions */}
        <div className="col-span-7">
          {selectedArtifact ? (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col h-[700px]">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {selectedArtifact.name}
                    </span>
                    <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                      {selectedArtifact.format}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    ID: <span className="font-mono">{selectedArtifact.id}</span>
                    {selectedArtifact.source_incident_id && (
                      <span className="ml-2">
                        • Source: <span className="font-mono font-semibold text-indigo-600">{selectedArtifact.source_incident_id}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copyContent(selectedArtifact.content)}
                    className="p-1.5 border border-slate-300 rounded text-slate-600 hover:bg-white text-xs flex items-center gap-1 transition"
                    title="Copy Content"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>

                  <button
                    onClick={() => handleDownload(selectedArtifact)}
                    className="p-1.5 border border-slate-300 rounded text-slate-600 hover:bg-white text-xs flex items-center gap-1 transition"
                    title="Download File"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={() => handleValidate(selectedArtifact.id)}
                    className="px-2.5 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold hover:bg-slate-700 transition"
                  >
                    Validate
                  </button>
                </div>
              </div>

              {/* Validation & Approval Banner */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Validation:</span>
                    <span
                      className={`font-semibold font-mono ${
                        selectedArtifact.validation_status === "VALID"
                          ? "text-emerald-700"
                          : selectedArtifact.validation_status === "WARNING"
                          ? "text-amber-700"
                          : "text-rose-700"
                      }`}
                    >
                      {selectedArtifact.validation_status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Approval:</span>
                    <span
                      className={`font-semibold ${
                        selectedArtifact.approval_status === "APPROVED"
                          ? "text-emerald-700"
                          : selectedArtifact.approval_status === "REJECTED"
                          ? "text-rose-700"
                          : "text-amber-700"
                      }`}
                    >
                      {selectedArtifact.approval_status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {selectedArtifact.approval_status === "PENDING_REVIEW" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReject(selectedArtifact.id)}
                      className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded text-xs font-semibold transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selectedArtifact.id)}
                      className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-xs font-semibold transition shadow-sm"
                    >
                      Approve Manifest
                    </button>
                  </div>
                )}
              </div>

              {/* Validation Warning / Error List */}
              {selectedArtifact.validation_errors && selectedArtifact.validation_errors.length > 0 && (
                <div className="p-2.5 bg-amber-50/70 border-b border-amber-200 text-[11px] text-amber-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    Validation Diagnostics:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[10.5px]">
                    {selectedArtifact.validation_errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Code Viewer */}
              <div className="flex-1 p-4 bg-slate-950 overflow-auto font-mono text-xs text-slate-200 leading-relaxed">
                <pre>{selectedArtifact.content}</pre>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400 text-xs h-[700px] flex items-center justify-center">
              Select an artifact from the left column to view and validate its contents.
            </div>
          )}
        </div>
      </div>

      {/* Generator Modal */}
      {showGenModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                Generate Configuration Artifact
              </h3>
              <button
                onClick={() => setShowGenModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Artifact Type</label>
                <select
                  value={genType}
                  onChange={(e) => setGenType(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-xs bg-white"
                >
                  <option value="kubernetes_manifest">Kubernetes Manifest (YAML)</option>
                  <option value="docker_config">Docker Configuration</option>
                  <option value="terraform_template">Terraform Infrastructure (HCL)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Template Subtype</label>
                <select
                  value={genSubtype}
                  onChange={(e) => setGenSubtype(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-xs bg-white"
                >
                  {genType === "kubernetes_manifest" ? (
                    <>
                      <option value="deployment">Deployment Manifest</option>
                      <option value="service">Service Manifest</option>
                    </>
                  ) : genType === "docker_config" ? (
                    <>
                      <option value="dockerfile">Hardened Multi-Stage Dockerfile</option>
                      <option value="compose">Docker Compose Stack</option>
                    </>
                  ) : (
                    <>
                      <option value="docker_infrastructure">Docker Infrastructure HCL</option>
                      <option value="simulated_cloud">Simulated Cloud VPC/DB HCL</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Service</label>
                <input
                  type="text"
                  value={genService}
                  onChange={(e) => setGenService(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-xs font-mono"
                  placeholder="e.g. synexis-postgres"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Source Incident ID (Optional)</label>
                <input
                  type="text"
                  value={genIncident}
                  onChange={(e) => setGenIncident(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-xs font-mono"
                  placeholder="e.g. INC-00042"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 transition"
                >
                  {generating ? "Generating..." : "Generate & Validate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
