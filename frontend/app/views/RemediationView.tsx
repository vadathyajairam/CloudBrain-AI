"use client";

import React, { useState, useEffect } from "react";
import {
  Wrench,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Activity,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  Play,
  FileCheck2,
} from "lucide-react";
import { RemediationActionItem, AuditLogItem, api } from "../lib/api";

export const RemediationView: React.FC = () => {
  const [actions, setActions] = useState<RemediationActionItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [operatorRole, setOperatorRole] = useState<string>("admin");
  const [operatorName, setOperatorName] = useState<string>("admin");

  const fetchData = async () => {
    setLoading(true);
    try {
      const actRes = await api.getRemediationActions();
      setActions(actRes.actions || []);
      const auditRes = await api.getAuditLogs();
      setAuditLogs(auditRes.audit_logs || []);
    } catch (e) {
      console.error("Error loading remediation data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (actionId: string) => {
    setApprovingId(actionId);
    try {
      await api.approveRemediation(actionId, operatorName, operatorRole);
      await fetchData();
    } catch (err: any) {
      alert(`Approval/Execution failed: ${err.message}`);
    } finally {
      setApprovingId(null);
    }
  };

  const pendingActions = actions.filter((a) => a.status === "PENDING");
  const executedActions = actions.filter((a) => a.status !== "PENDING");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 leading-tight flex items-center gap-2">
              <Wrench className="w-5 h-5 text-indigo-600" />
              Human-in-the-Loop Safe Remediation & Audit Console
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              Zero-Fake Policy
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict authorization, safety allowlist gating, real Docker executions, post-remediation health checks, and verified audit trails
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          <span>Refresh Console</span>
        </button>
      </div>

      {/* Safety Protocol Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Synexis Authorization & Safety Protocol Active
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
            LLMs cannot execute raw arbitrary shell commands. All suggested fixes require authenticated operator review, container allowlist verification (<code>synexis-*</code>), and mandatory post-action health checks.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold">Operator:</span>
          </div>
          <input
            type="text"
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            className="w-20 px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded font-mono"
            placeholder="Username"
          />
          <select
            value={operatorRole}
            onChange={(e) => setOperatorRole(e.target.value)}
            className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded font-mono text-indigo-700 font-semibold"
          >
            <option value="admin">admin</option>
            <option value="sre_operator">sre_operator</option>
            <option value="operator">operator</option>
          </select>
        </div>
      </div>

      {/* ── Pending Approvals Section ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            Pending Operator Approvals ({pendingActions.length})
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">Source: Database Action Queue</span>
        </div>

        {pendingActions.length === 0 ? (
          <div className="p-8 rounded-xl bg-white border border-slate-200 text-center text-slate-500 text-xs">
            No actions awaiting approval. When AI RCA proposes a fix, it will appear here for review.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {pendingActions.map((act) => (
              <div
                key={act.id}
                className="p-4 rounded-xl bg-white border border-amber-300 ring-1 ring-amber-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                      PENDING REVIEW
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900">{act.action_type}</span>
                    <span className="text-xs text-slate-500">on</span>
                    <span className="text-xs font-mono text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                      {act.target}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">{act.reason}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Proposed by: {act.proposed_by} • Action ID: {act.id}
                  </div>
                </div>

                <button
                  onClick={() => handleApprove(act.id)}
                  disabled={approvingId === act.id}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{approvingId === act.id ? "Executing..." : "Approve & Execute Fix"}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Executed Actions & Post-Verification ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Executed Actions & Health Verifications ({executedActions.length})
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">Source: Docker + Verification Engine</span>
        </div>

        {executedActions.length === 0 ? (
          <div className="p-8 rounded-xl bg-white border border-slate-200 text-center text-slate-500 text-xs">
            No remediation history recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {executedActions.map((act) => {
              const isSuccess = act.status === "SUCCESS";
              return (
                <div
                  key={act.id}
                  className={`p-4 rounded-xl border bg-white shadow-sm space-y-3 ${
                    isSuccess ? "border-slate-200" : "border-rose-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          isSuccess
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {act.status}
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-800">{act.action_type}</span>
                      <span className="text-xs text-slate-500 font-mono">→ {act.target}</span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono">
                      Approved by: <span className="font-semibold text-slate-800">{act.approved_by || "admin"}</span> •{" "}
                      {act.executed_at?.slice(0, 19).replace("T", " ")}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600">{act.reason}</div>

                  {act.verification && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                        <span>Post-Remediation 4-Point Health Verification</span>
                        <span className={`text-[10px] font-mono ${act.verification.passed ? "text-emerald-600 font-bold" : "text-rose-600"}`}>
                          {act.verification.passed ? "VERIFIED RECOVERED" : "VERIFICATION FAILED"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">{act.verification.summary}</div>
                      {act.verification.checks && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-1">
                          {act.verification.checks.map((chk, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[10px] p-1.5 bg-white rounded border border-slate-200 font-mono">
                              <span className="text-slate-600">{chk.check}:</span>
                              <span className={chk.status === "PASSED" ? "text-emerald-600 font-bold" : "text-slate-400"}>
                                {chk.status} ({chk.detail})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Verified Compliance Audit Trail ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4 text-indigo-600" />
            Compliance Audit Trail ({auditLogs.length} Events)
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">Source: PostgreSQL / SQLite `audit_logs` table</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Timestamp", "Action", "Target", "Actor", "Role", "Reason", "Result"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {auditLogs.slice(0, 15).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-500">{log.timestamp?.slice(11, 19) || "—"}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-800">{log.action}</td>
                    <td className="px-4 py-2.5 text-indigo-600">{log.target || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-700">{log.actor}</td>
                    <td className="px-4 py-2.5 text-slate-600">{log.role}</td>
                    <td className="px-4 py-2.5 text-slate-500 font-sans max-w-xs truncate">{log.reason || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.result === "SUCCESS" || log.result === "APPROVED" || log.result === "RESOLVED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {log.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
