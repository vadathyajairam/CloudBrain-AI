const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export interface SystemMetrics {
  timestamp: string;
  iso_timestamp: string;
  status: "HEALTHY" | "DEGRADED" | "CRITICAL";
  health_score: number;
  cpu: {
    usage_percent: number;
    cores_usage: number[];
    core_count: number;
    physical_core_count: number;
  };
  memory: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
    usage_percent: number;
    swap_percent: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    usage_percent: number;
  };
  network: {
    upload_kbps: number;
    download_kbps: number;
    total_sent_mb: number;
    total_recv_mb: number;
  };
  processes: {
    count: number;
  };
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "restarting" | "exited";
  state: "healthy" | "unhealthy" | "degraded" | "exited" | "starting" | "running";
  cpu_percent: number;
  memory_mb: number;
  memory_limit_mb: number;
  ports: string[];
  restart_count: number;
  uptime: string;
  created_at: string;
  env: Record<string, string>;
  healthcheck: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  iso_timestamp?: string;
  level: "INFO" | "WARN" | "ERROR" | "CRITICAL" | "DEBUG";
  service: string;
  message: string;
  source?: string;
}

export interface RAGSource {
  chunk_id?: string;
  document_id?: string;
  title: string;
  category: string;
  content?: string;
  score?: number;
  matched_terms?: string[];
}

export interface StructuredAction {
  action: string;
  target: string;
  reason: string;
}

export interface RCAReport {
  incident_id: string;
  timestamp: string;
  status: string;
  model_used: string;
  root_cause: string;
  confidence: number | null;
  alternative_causes: string[];
  recommendation: string;
  structured_actions: StructuredAction[];
  rag_sources: RAGSource[];
  evidence_summary: string;
  evidence_bundle: {
    system: any;
    containers: any[];
    log_stats: any;
    error_samples: any[];
    collected_evidence: any[];
  };
}

export interface ChaosScenario {
  id: string;
  title: string;
  category: string;
  severity: string;
  description: string;
  target_service: string;
  symptoms: string[];
}

export interface IncidentItem {
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
  resolution_summary?: string;
  evidence?: any[];
  latest_analysis?: any;
}

export interface RemediationActionItem {
  id: string;
  incident_id?: string;
  action_type: string;
  target: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "EXECUTING" | "SUCCESS" | "FAILED";
  proposed_by: string;
  approved_by?: string;
  approved_at?: string;
  executed_at?: string;
  result?: any;
  verification?: {
    passed: boolean;
    summary: string;
    checks: { check: string; status: string; detail: string }[];
  };
  created_at?: string;
}

export interface AuditLogItem {
  id: number;
  action: string;
  target?: string;
  actor: string;
  role: string;
  reason?: string;
  details?: any;
  result: string;
  timestamp: string;
}

export interface EnvironmentInfo {
  id: string;
  name: string;
  env_type: string;
  connected: boolean;
  status: "connected" | "disconnected" | "not_configured";
  status_detail: string;
  data_provided: string[];
  source_library: string;
  last_checked?: string;
}

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    return res.json();
  },

  async getLiveMetrics(): Promise<SystemMetrics> {
    const res = await fetch(`${API_BASE}/metrics/live`, { cache: "no-store" });
    return res.json();
  },

  async getMetricsHistory(limit = 60): Promise<{ history: SystemMetrics[] }> {
    const res = await fetch(`${API_BASE}/metrics/history?limit=${limit}`, { cache: "no-store" });
    return res.json();
  },

  async getContainers(): Promise<{ docker_available: boolean; containers: ContainerInfo[] }> {
    const res = await fetch(`${API_BASE}/containers`, { cache: "no-store" });
    return res.json();
  },

  async restartContainer(nameOrId: string) {
    const res = await fetch(`${API_BASE}/containers/${nameOrId}/restart`, { method: "POST" });
    return res.json();
  },

  async stopContainer(nameOrId: string) {
    const res = await fetch(`${API_BASE}/containers/${nameOrId}/stop`, { method: "POST" });
    return res.json();
  },

  async startContainer(nameOrId: string) {
    const res = await fetch(`${API_BASE}/containers/${nameOrId}/start`, { method: "POST" });
    return res.json();
  },

  async getLogs(params?: { service?: string; level?: string; search?: string; limit?: number }): Promise<{ logs: LogEntry[] }> {
    const q = new URLSearchParams();
    if (params?.service) q.append("service", params.service);
    if (params?.level) q.append("level", params.level);
    if (params?.search) q.append("search", params.search);
    if (params?.limit) q.append("limit", params.limit.toString());
    const res = await fetch(`${API_BASE}/logs?${q.toString()}`, { cache: "no-store" });
    return res.json();
  },

  async getLogStats() {
    const res = await fetch(`${API_BASE}/logs/stats`, { cache: "no-store" });
    return res.json();
  },

  async clearLogs() {
    const res = await fetch(`${API_BASE}/logs/clear`, { method: "POST" });
    return res.json();
  },

  async getIncidents(): Promise<{ stats: any; active_count: number; active_incidents: IncidentItem[]; resolved_incidents: IncidentItem[]; all_incidents: IncidentItem[] }> {
    const res = await fetch(`${API_BASE}/incidents`, { cache: "no-store" });
    return res.json();
  },

  async getIncident(id: string): Promise<IncidentItem> {
    const res = await fetch(`${API_BASE}/incidents/${id}`, { cache: "no-store" });
    return res.json();
  },

  async acknowledgeIncident(id: string) {
    const res = await fetch(`${API_BASE}/incidents/${id}/acknowledge`, { method: "PATCH" });
    return res.json();
  },

  async investigateIncident(id: string) {
    const res = await fetch(`${API_BASE}/incidents/${id}/investigate`, { method: "PATCH" });
    return res.json();
  },

  async resolveIncident(id: string, summary?: string) {
    const res = await fetch(`${API_BASE}/incidents/${id}/resolve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution_summary: summary }),
    });
    return res.json();
  },

  async analyzeRCA(incidentId?: string): Promise<RCAReport> {
    const res = await fetch(`${API_BASE}/rca/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incident_id: incidentId }),
    });
    return res.json();
  },

  // ── RAG Knowledge Base ─────────────────────────────────────
  async getRAGStats() {
    const res = await fetch(`${API_BASE}/rag/stats`, { cache: "no-store" });
    return res.json();
  },

  async getRAGDocuments(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/rag/documents`, { cache: "no-store" });
    return res.json();
  },

  async searchRAG(query: string, topK = 4) {
    const res = await fetch(`${API_BASE}/rag/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, top_k: topK }),
    });
    return res.json();
  },

  // ── Environments / Data Sources ────────────────────────────
  async getEnvironments(): Promise<{ environments: EnvironmentInfo[]; connected_count: number; total_count: number }> {
    const res = await fetch(`${API_BASE}/environments`, { cache: "no-store" });
    return res.json();
  },

  // ── Config Analyzer ────────────────────────────────────────
  async auditConfig(fileType: string, content: string) {
    const res = await fetch(`${API_BASE}/config/audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_type: fileType, content }),
    });
    return res.json();
  },

  async getSampleConfigs() {
    const res = await fetch(`${API_BASE}/config/samples`, { cache: "no-store" });
    return res.json();
  },

  // ── Chaos Sandbox ──────────────────────────────────────────
  async getChaosScenarios(): Promise<{ active_scenario: string | null; scenarios: ChaosScenario[] }> {
    const res = await fetch(`${API_BASE}/chaos/scenarios`, { cache: "no-store" });
    return res.json();
  },

  async triggerChaos(scenarioId: string) {
    const res = await fetch(`${API_BASE}/chaos/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario_id: scenarioId }),
    });
    return res.json();
  },

  async resetChaos() {
    const res = await fetch(`${API_BASE}/chaos/reset`, { method: "POST" });
    return res.json();
  },

  // ── Remediation & Audit ────────────────────────────────────
  async proposeRemediation(action: { action_type: string; target: string; reason: string; incident_id?: string }) {
    const res = await fetch(`${API_BASE}/remediate/propose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    });
    return res.json();
  },

  async approveRemediation(actionId: string, approvedBy = "admin", role = "admin") {
    const res = await fetch(`${API_BASE}/remediate/${actionId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved_by: approvedBy, role }),
    });
    return res.json();
  },

  async getRemediationActions(): Promise<{ total: number; actions: RemediationActionItem[]; pending: RemediationActionItem[] }> {
    const res = await fetch(`${API_BASE}/remediate/actions`, { cache: "no-store" });
    return res.json();
  },

  async getAuditLogs(): Promise<{ total: number; audit_logs: AuditLogItem[] }> {
    const res = await fetch(`${API_BASE}/remediate/audit-logs`, { cache: "no-store" });
    return res.json();
  },

  // ── Copilot Chat ───────────────────────────────────────────
  async sendChatMessage(message: string) {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    return res.json();
  },

  async getChatHistory() {
    const res = await fetch(`${API_BASE}/chat/history`, { cache: "no-store" });
    return res.json();
  },

  async clearChatHistory() {
    const res = await fetch(`${API_BASE}/chat/clear`, { method: "POST" });
    return res.json();
  },
};
