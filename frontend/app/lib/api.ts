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
  status: "running" | "stopped" | "restarting";
  state: "healthy" | "unhealthy" | "degraded" | "exited" | "starting";
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
  iso_timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "CRITICAL" | "DEBUG";
  service: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface EvidenceItem {
  type: string;
  source: string;
  detail: string;
}

export interface RecommendedAction {
  id: string;
  title: string;
  command: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  action_type: string;
  target_id: string;
}

export interface RCAReport {
  incident_id: string;
  timestamp: string;
  status: "HEALTHY" | "ANALYZED";
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence_score: number;
  detected_issue: string;
  probable_root_cause: string;
  evidence_chain: EvidenceItem[];
  impact: string;
  recommended_actions: RecommendedAction[];
  ai_explanation: string;
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

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
    return res.json();
  },

  async getLiveMetrics(): Promise<SystemMetrics> {
    const res = await fetch(`${API_BASE}/metrics/live`, { cache: 'no-store' });
    return res.json();
  },

  async getMetricsHistory(limit = 60): Promise<{ history: SystemMetrics[] }> {
    const res = await fetch(`${API_BASE}/metrics/history?limit=${limit}`, { cache: 'no-store' });
    return res.json();
  },

  async getContainers(): Promise<{ sandbox_mode: boolean; containers: ContainerInfo[] }> {
    const res = await fetch(`${API_BASE}/containers`, { cache: 'no-store' });
    return res.json();
  },

  async restartContainer(id: string) {
    const res = await fetch(`${API_BASE}/containers/${id}/restart`, { method: 'POST' });
    return res.json();
  },

  async stopContainer(id: string) {
    const res = await fetch(`${API_BASE}/containers/${id}/stop`, { method: 'POST' });
    return res.json();
  },

  async startContainer(id: string) {
    const res = await fetch(`${API_BASE}/containers/${id}/start`, { method: 'POST' });
    return res.json();
  },

  async getLogs(params?: { service?: string; level?: string; search?: string; limit?: number }): Promise<{ logs: LogEntry[] }> {
    const q = new URLSearchParams();
    if (params?.service) q.append("service", params.service);
    if (params?.level) q.append("level", params.level);
    if (params?.search) q.append("search", params.search);
    if (params?.limit) q.append("limit", params.limit.toString());
    const res = await fetch(`${API_BASE}/logs?${q.toString()}`, { cache: 'no-store' });
    return res.json();
  },

  async getLogStats() {
    const res = await fetch(`${API_BASE}/logs/stats`, { cache: 'no-store' });
    return res.json();
  },

  async clearLogs() {
    const res = await fetch(`${API_BASE}/logs/clear`, { method: 'POST' });
    return res.json();
  },

  async getIncidents() {
    const res = await fetch(`${API_BASE}/incidents`, { cache: 'no-store' });
    return res.json();
  },

  async analyzeRCA(context?: string): Promise<RCAReport> {
    const res = await fetch(`${API_BASE}/analyze/rca`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_context: context })
    });
    return res.json();
  },

  async auditConfig(fileType: string, content: string) {
    const res = await fetch(`${API_BASE}/config/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_type: fileType, content })
    });
    return res.json();
  },

  async getSampleConfigs() {
    const res = await fetch(`${API_BASE}/config/samples`, { cache: 'no-store' });
    return res.json();
  },

  async getChaosScenarios(): Promise<{ active_scenario: string | null; scenarios: ChaosScenario[] }> {
    const res = await fetch(`${API_BASE}/chaos/scenarios`, { cache: 'no-store' });
    return res.json();
  },

  async triggerChaos(scenarioId: string) {
    const res = await fetch(`${API_BASE}/chaos/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_id: scenarioId })
    });
    return res.json();
  },

  async resetChaos() {
    const res = await fetch(`${API_BASE}/chaos/reset`, { method: 'POST' });
    return res.json();
  },

  async executeRemediation(action: { action_id: string; target_id: string; action_type: string; command: string }) {
    const res = await fetch(`${API_BASE}/remediate/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action)
    });
    return res.json();
  },

  async getRemediationHistory() {
    const res = await fetch(`${API_BASE}/remediate/history`, { cache: 'no-store' });
    return res.json();
  },

  async sendChatMessage(message: string) {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    return res.json();
  },

  async getChatHistory() {
    const res = await fetch(`${API_BASE}/chat/history`, { cache: 'no-store' });
    return res.json();
  },

  async clearChatHistory() {
    const res = await fetch(`${API_BASE}/chat/clear`, { method: 'POST' });
    return res.json();
  }
};
