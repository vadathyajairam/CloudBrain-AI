"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  api,
  SystemMetrics,
  ContainerInfo,
  RCAReport,
  LogEntry,
  ChaosScenario,
} from "./lib/api";

import { Navbar } from "./components/Navbar";
import { Sidebar, NavTab } from "./components/Sidebar";
import { ChaosModal } from "./components/ChaosModal";
import { IncidentInvestigationModal } from "./components/IncidentInvestigationModal";
import { DevOpsChatDrawer } from "./components/DevOpsChatDrawer";

import { DashboardView } from "./views/DashboardView";
import { MonitoringView } from "./views/MonitoringView";
import { LogsView } from "./views/LogsView";
import { AIRCAView } from "./views/AIRCAView";
import IncidentsView from "./views/IncidentsView";
import { ContainersView } from "./views/ContainersView";
import { ConfigView } from "./views/ConfigView";
import { ChaosView } from "./views/ChaosView";
import { RemediationView } from "./views/RemediationView";
import DataSourcesView from "./views/DataSourcesView";
import ArtifactsView from "./views/ArtifactsView";

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [refreshRate, setRefreshRate] = useState<number>(2000);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isChaosModalOpen, setIsChaosModalOpen] = useState<boolean>(false);
  const [isInvestigationModalOpen, setIsInvestigationModalOpen] = useState<boolean>(false);
  const [investigationReport, setInvestigationReport] = useState<RCAReport | null>(null);

  // Core Data States
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<SystemMetrics[]>([]);
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [rcaReport, setRcaReport] = useState<RCAReport | null>(null);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [chaosData, setChaosData] = useState<{
    active_scenario: string | null;
    scenarios: ChaosScenario[];
  }>({ active_scenario: null, scenarios: [] });

  // Polling / Data Fetching
  const fetchAllData = useCallback(async () => {
    try {
      const liveM = await api.getLiveMetrics();
      if (liveM) {
        setMetrics(liveM);
        setMetricsHistory((prev) => {
          const next = [...prev, liveM];
          return next.slice(-60);
        });
      }
      const cData = await api.getContainers();
      if (cData.containers) setContainers(cData.containers);
      const chData = await api.getChaosScenarios();
      if (chData) setChaosData(chData);
      const rca = await api.analyzeRCA();
      if (rca) setRcaReport(rca);
    } catch (err) {
      console.error("Telemetry sync error:", err);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (refreshRate === 0) return;
    const interval = setInterval(fetchAllData, refreshRate);
    return () => clearInterval(interval);
  }, [refreshRate, fetchAllData]);

  // Chaos actions
  const handleTriggerChaos = async (scenarioId: string) => {
    await api.triggerChaos(scenarioId);
    await fetchAllData();
    setIsChaosModalOpen(false);
  };
  const handleResetChaos = async () => {
    await api.resetChaos();
    await fetchAllData();
    setIsChaosModalOpen(false);
  };
  const handleRestartContainer = async (id: string) => {
    await api.restartContainer(id);
    await fetchAllData();
  };

  const handleOpenInvestigation = (customData?: any) => {
    if (customData && customData.status === "RESOLVED") {
      const resolvedRpt: RCAReport = {
        incident_id: customData.id || "INC-RESOLVED",
        timestamp: customData.timestamp || new Date().toISOString(),
        status: "RESOLVED",
        model_used: "synexis-rca",
        root_cause: customData.probable_root_cause || customData.title || "Resolved Incident",
        confidence: customData.confidence || 95,
        alternative_causes: [],
        recommendation: `Resolved with: ${customData.resolution || "Manual remediation"}`,
        structured_actions: [],
        rag_sources: [],
        evidence_summary: `Resolution note: ${customData.resolution || "Verified recovered"}`,
        evidence_bundle: {
          system: {},
          containers: [],
          log_stats: {},
          error_samples: [],
          collected_evidence: [],
        },
      };
      setInvestigationReport(resolvedRpt);
    } else {
      setInvestigationReport(rcaReport);
    }
    setIsInvestigationModalOpen(true);
  };

  const handleAnalyzeLogsWithAI = async (contextText: string) => {
    try {
      const res = await api.analyzeRCA();
      setInvestigationReport(res);
      setIsInvestigationModalOpen(true);
    } catch {
      setActiveTab("ai_rca");
    }
  };

  const activeIncidentsCount = rcaReport && rcaReport.status !== "HEALTHY" && Boolean(rcaReport.root_cause) ? 1 : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* ── Full-width sticky top bar ── */}
      <Navbar
        metrics={metrics}
        activeScenario={chaosData.active_scenario}
        refreshRate={refreshRate}
        setRefreshRate={setRefreshRate}
        onOpenChaosModal={() => setIsChaosModalOpen(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        pageTitle={activeTab}
      />

      {/* ── Main workspace: sidebar + content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeIncidentsCount={activeIncidentsCount}
          activeChaos={chaosData.active_scenario}
        />

        {/* Dynamic content canvas */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {activeTab === "dashboard" && (
            <DashboardView
              metrics={metrics}
              metricsHistory={metricsHistory}
              containers={containers}
              rcaReport={rcaReport}
              recentLogs={recentLogs}
              activeChaos={chaosData.active_scenario}
              onOpenInvestigation={() => handleOpenInvestigation()}
              onOpenChaosModal={() => setIsChaosModalOpen(true)}
              onSelectTab={setActiveTab}
              onRestartContainer={handleRestartContainer}
            />
          )}

          {activeTab === "monitoring" && (
            <MonitoringView metrics={metrics} history={metricsHistory} />
          )}

          {activeTab === "logs" && (
            <LogsView onAnalyzeWithAI={handleAnalyzeLogsWithAI} />
          )}

          {activeTab === "ai_rca" && (
            <AIRCAView report={rcaReport} onRefresh={fetchAllData} />
          )}

          {activeTab === "incidents" && <IncidentsView />}

          {activeTab === "containers" && (
            <ContainersView containers={containers} onRefresh={fetchAllData} />
          )}

          {activeTab === "config" && <ConfigView />}

          {activeTab === "remediation" && <RemediationView />}

          {activeTab === "chaos" && (
            <ChaosView
              scenarios={chaosData.scenarios}
              activeScenario={chaosData.active_scenario}
              onTrigger={handleTriggerChaos}
              onReset={handleResetChaos}
              onOpenInvestigation={() => handleOpenInvestigation()}
            />
          )}

          {activeTab === "artifacts" && <ArtifactsView />}

          {activeTab === "data_sources" && <DataSourcesView />}

          {activeTab === "assistant" && (
            <div className="p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Synexis AI DevOps Copilot Chat
              </h2>
              <DevOpsChatDrawer isOpen={true} onClose={() => {}} isFullScreen={true} />
            </div>
          )}
        </main>
      </div>

      {/* ── Floating AI Chat Drawer ── */}
      {activeTab !== "assistant" && (
        <DevOpsChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {/* ── Chaos Sandbox Modal ── */}
      <ChaosModal
        isOpen={isChaosModalOpen}
        onClose={() => setIsChaosModalOpen(false)}
        scenarios={chaosData.scenarios}
        activeScenario={chaosData.active_scenario}
        onTrigger={handleTriggerChaos}
        onReset={handleResetChaos}
      />

      {/* ── Incident Investigation & Remediation Modal ── */}
      <IncidentInvestigationModal
        isOpen={isInvestigationModalOpen}
        onClose={() => setIsInvestigationModalOpen(false)}
        report={investigationReport || rcaReport}
        onRemediationComplete={fetchAllData}
      />
    </div>
  );
}
