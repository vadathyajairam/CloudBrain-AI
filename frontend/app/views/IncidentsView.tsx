"use client";
import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface Evidence {
  type: string;
  source: string;
  detail: string;
  collected_at?: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "DETECTED" | "ACKNOWLEDGED" | "INVESTIGATING" | "REMEDIATING" | "RESOLVED" | "CLOSED";
  service: string;
  container_id?: string;
  rule_id?: string;
  detected_at: string;
  updated_at?: string;
  resolved_at?: string;
  auto_resolved?: boolean;
  evidence: Evidence[];
  latest_analysis?: {
    root_cause?: string;
    confidence?: number | null;
    recommendation?: string;
    model_used?: string;
  } | null;
}

interface IncidentStats {
  total: number;
  active: number;
  critical_active: number;
  resolved_today: number;
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`status-badge severity-${severity}`}>{severity}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge incident-status-${status}`}>{status}</span>
  );
}

function EmptyIncidents() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">✅</div>
      <div className="empty-state-title">No Active Incidents</div>
      <div className="empty-state-desc">
        All systems are operating normally. Incidents will appear here automatically when the detection engine triggers a rule.
      </div>
    </div>
  );
}

function IncidentRow({
  incident,
  onAction,
}: {
  incident: Incident;
  onAction: (id: string, action: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const detectedTime = incident.detected_at
    ? new Date(incident.detected_at).toLocaleString()
    : "—";

  const nextAction = (): string | null => {
    switch (incident.status) {
      case "DETECTED":      return "acknowledge";
      case "ACKNOWLEDGED":  return "investigate";
      case "INVESTIGATING": return "resolve";
      default:              return null;
    }
  };

  const actionLabel: Record<string, string> = {
    acknowledge: "Acknowledge",
    investigate: "Investigate",
    resolve: "Resolve",
  };

  const action = nextAction();

  return (
    <>
      <tr
        style={{ cursor: "pointer" }}
        onClick={() => setExpanded((p) => !p)}
      >
        <td>
          <SeverityBadge severity={incident.severity} />
        </td>
        <td>
          <div style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: 13 }}>
            {incident.title}
          </div>
          {incident.service && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {incident.service}
              {incident.rule_id && ` · rule: ${incident.rule_id}`}
            </div>
          )}
        </td>
        <td>
          <StatusBadge status={incident.status} />
          {incident.auto_resolved && (
            <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>auto</span>
          )}
        </td>
        <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{detectedTime}</td>
        <td>
          {action && (
            <button
              className="btn btn-secondary"
              style={{ fontSize: 11, padding: "3px 10px" }}
              onClick={(e) => {
                e.stopPropagation();
                onAction(incident.id, action);
              }}
            >
              {actionLabel[action]}
            </button>
          )}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td
            colSpan={5}
            style={{
              background: "var(--surface-1)",
              padding: "0 0 0 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ padding: "14px 20px" }}>
              {/* Description */}
              {incident.description && (
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
                  {incident.description}
                </p>
              )}

              {/* AI Analysis */}
              {incident.latest_analysis && (
                <div
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "12px 14px",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    AI Analysis · {incident.latest_analysis.model_used}
                  </div>
                  {incident.latest_analysis.root_cause && (
                    <div style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 6 }}>
                      <strong>Root Cause:</strong> {incident.latest_analysis.root_cause}
                    </div>
                  )}
                  {incident.latest_analysis.confidence !== null && incident.latest_analysis.confidence !== undefined ? (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                      Confidence: <strong>{incident.latest_analysis.confidence}%</strong>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--warning)" }}>
                      Confidence: Insufficient evidence
                    </div>
                  )}
                  {incident.latest_analysis.recommendation && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
                      <strong>Recommendation:</strong> {incident.latest_analysis.recommendation}
                    </div>
                  )}
                </div>
              )}

              {/* Evidence */}
              {incident.evidence && incident.evidence.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    Evidence ({incident.evidence.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {incident.evidence.map((ev, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 10,
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          padding: "5px 0",
                          borderBottom: i < incident.evidence.length - 1 ? "1px solid var(--border)" : "none",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "1px 5px",
                            borderRadius: 3,
                            background: "var(--surface-3)",
                            color: "var(--text-muted)",
                            flexShrink: 0,
                            alignSelf: "flex-start",
                            marginTop: 1,
                          }}
                        >
                          {ev.type}
                        </span>
                        <span>
                          <span style={{ color: "var(--text-muted)", marginRight: 6 }}>{ev.source}</span>
                          {ev.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function IncidentsView() {
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [resolvedIncidents, setResolvedIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "resolved">("active");
  const [lastRefresh, setLastRefresh] = useState("");

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch(`${API}/incidents`);
      const data = await res.json();
      setActiveIncidents(data.active_incidents || []);
      setResolvedIncidents(data.resolved_incidents || []);
      setStats(data.stats || null);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch {
      /* backend may not be running */
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAction = async (id: string, action: string) => {
    try {
      await fetch(`${API}/incidents/${id}/${action}`, { method: "PATCH" });
      await fetchIncidents();
    } catch {}
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const displayedIncidents = tab === "active" ? activeIncidents : resolvedIncidents;

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Incidents
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            Detected by the Synexis rule engine · auto-updated every 5s
          </p>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, color: "var(--text-muted)" }}>
          {lastRefresh && <>Updated: {lastRefresh}</>}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid-4" style={{ marginBottom: 20 }}>
          {[
            { label: "Active", value: stats.active, cls: stats.active > 0 ? "danger" : "healthy" },
            { label: "Critical Active", value: stats.critical_active, cls: stats.critical_active > 0 ? "critical" : "healthy" },
            { label: "Resolved Today", value: stats.resolved_today, cls: "info" },
            { label: "Total All Time", value: stats.total, cls: "muted" },
          ].map((s) => (
            <div key={s.label} className="card-sm">
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {(["active", "resolved"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              background: "transparent",
              border: "none",
              color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
              fontFamily: "var(--font-sans)",
            }}
          >
            {t === "active" ? `Active (${activeIncidents.length})` : `Resolved (${resolvedIncidents.length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "24px 0" }}>Loading incidents…</div>
      ) : displayedIncidents.length === 0 ? (
        tab === "active" ? <EmptyIncidents /> : (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No Resolved Incidents</div>
            <div className="empty-state-desc">Resolved incidents will appear here.</div>
          </div>
        )
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Severity</th>
                <th>Incident</th>
                <th style={{ width: 140 }}>Status</th>
                <th style={{ width: 160 }}>Detected</th>
                <th style={{ width: 120 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedIncidents.map((inc) => (
                <IncidentRow key={inc.id} incident={inc} onAction={handleAction} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Source attribution */}
      <div style={{ marginTop: 16, fontSize: 11, color: "var(--text-muted)" }}>
        Source: Synexis Detection Engine · Database-backed · No simulated data
      </div>
    </div>
  );
}
