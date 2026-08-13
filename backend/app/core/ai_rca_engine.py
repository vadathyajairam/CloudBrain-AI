"""
ai_rca_engine.py  —  Evidence-Based AI RCA Engine with RAG (Synexis)

Architecture:
  Real Incident (Title, Rule, Service, Container ID)
       ↓
  Multi-Modal Evidence Collection (Host Metrics, Docker State, Error Logs, DB Evidence)
       +
  RAG Knowledge Retrieval (Curated Runbooks + Historical Resolved Incident Lessons)
       ↓
  LLM (Gemini primary / OpenAI secondary / Expert Rule-augmented Fallback)
       ↓
  Structured Response:
    - root_cause
    - confidence (0-100 or null if insufficient evidence)
    - alternative_causes
    - recommendation
    - structured_actions (allowlisted actions only)
    - rag_sources (citations of matched runbooks & past lessons)
       ↓
  Saved to ai_analyses table
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any, List, Optional

from backend.app.config import settings
from backend.app.core.container_engine import container_engine
from backend.app.core.log_engine import log_engine
from backend.app.core.monitoring import monitoring_engine
from backend.app.core.rag_engine import rag_engine
from backend.app.database import db_session
from backend.app.database.models import (
    AIAnalysis,
    Incident,
    IncidentEvidence,
)

# ── Structured Action Allowlist ───────────────────────────────────────────────
ALLOWED_ACTIONS: set[str] = {
    "restart_container",
    "start_container",
    "stop_container",
}


# ── Evidence Bundle Collection ────────────────────────────────────────────────

def _collect_evidence_bundle(incident_id: Optional[str] = None) -> dict[str, Any]:
    """
    Gather all available real telemetry and DB evidence for the incident.
    """
    metrics = monitoring_engine.get_latest()
    containers = container_engine.list_containers()
    burst = log_engine.get_error_burst_stats()
    recent_logs = log_engine.get_logs(limit=30)

    db_evidence: list[dict] = []
    incident_title = ""
    incident_rule = ""
    incident_service = ""
    if incident_id:
        with db_session() as db:
            inc = db.get(Incident, incident_id)
            if inc:
                incident_title = inc.title
                incident_rule = inc.rule_id or ""
                incident_service = inc.service or ""
                evidence_rows = (
                    db.query(IncidentEvidence)
                    .filter(IncidentEvidence.incident_id == incident_id)
                    .all()
                )
                db_evidence = [e.to_dict() for e in evidence_rows]

    return {
        "incident_id": incident_id,
        "incident_title": incident_title,
        "incident_rule": incident_rule,
        "incident_service": incident_service,
        "system": {
            "cpu_percent": metrics["cpu"]["usage_percent"],
            "memory_percent": metrics["memory"]["usage_percent"],
            "memory_used_gb": metrics["memory"]["used_gb"],
            "memory_total_gb": metrics["memory"]["total_gb"],
            "disk_percent": metrics["disk"]["usage_percent"],
            "health_score": metrics["health_score"],
            "status": metrics["status"],
        },
        "containers": [
            {
                "name": c["name"],
                "status": c["status"],
                "state": c["state"],
                "cpu_percent": c["cpu_percent"],
                "memory_mb": c["memory_mb"],
                "memory_limit_mb": c["memory_limit_mb"],
                "restart_count": c["restart_count"],
                "uptime": c["uptime"],
            }
            for c in containers
        ],
        "log_stats": {
            "total_logs": burst.get("total_logs", 0),
            "total_errors": burst.get("total_errors", 0),
            "total_warnings": burst.get("total_warnings", 0),
            "errors_last_30s": burst.get("errors_last_30s", 0),
            "errors_last_5m": burst.get("errors_last_5m", 0),
        },
        "recent_error_logs": [
            {
                "timestamp": l["timestamp"],
                "level": l["level"],
                "service": l["service"],
                "message": l["message"][:300],
            }
            for l in recent_logs
            if l["level"] in ("ERROR", "CRITICAL", "WARN")
        ][:10],
        "db_evidence": db_evidence,
    }


# ── LLM System Prompt ─────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are Synexis AI, an expert Senior Site Reliability Engineer performing Root Cause Analysis.

You are provided with:
1. Real Telemetry & Evidence (host metrics, Docker containers, error logs, incident detection rules).
2. Relevant RAG Knowledge Base Articles & Past Resolved Incident Lessons.

Your task: analyze the collected evidence grounded in the RAG knowledge and respond with a JSON object in EXACTLY this structure:
{
  "root_cause": "One clear sentence describing the root cause",
  "confidence": <integer 0-100 based on evidence strength, or null if evidence is insufficient>,
  "alternative_causes": ["Possible alternative cause 1", "Possible alternative cause 2"],
  "recommendation": "Clear actionable recommendation grounded in troubleshooting runbooks",
  "structured_actions": [
    {
      "action": "<one of: restart_container, start_container, stop_container>",
      "target": "<target container name starting with synexis->",
      "reason": "<why this action resolves the issue>"
    }
  ]
}

STRICT SAFETY RULES:
- Only recommend actions from the allowlist: restart_container, start_container, stop_container.
- Targets MUST start with 'synexis-'.
- Never execute shell commands directly.
- Base confidence strictly on evidence strength. Do not invent arbitrary high confidence when evidence is missing.
- Respond with pure JSON only, no markdown code fence wrapping if possible."""


# ── Fallback Rules-Augmented Reasoning (when no LLM API key configured) ───────

def _rules_fallback_analysis(
    bundle: dict[str, Any], rag_chunks: list[dict[str, Any]]
) -> dict[str, Any]:
    """
    Deterministic rule-based fallback when LLM API keys are not present.
    Integrates retrieved RAG runbooks to provide high quality explanations.
    """
    rule_id = bundle.get("incident_rule", "")
    service = bundle.get("incident_service", "")
    containers = bundle.get("containers", [])
    logs = bundle.get("recent_error_logs", [])
    system = bundle.get("system", {})

    target_name = service or ("synexis-postgres" if "postgres" in rule_id else "synexis-demo-app")
    # match existing container name if found
    for c in containers:
        if service and c["name"] == service:
            target_name = c["name"]
            break
        elif not service and ("demo-app" in c["name"] or "postgres" in c["name"]):
            target_name = c["name"]

    rag_rec = (
        rag_chunks[0]["content"][:300] + "..."
        if rag_chunks
        else "Review service logs and verify container health."
    )

    if rule_id == "container_stopped":
        return {
            "root_cause": f"Container '{target_name}' exited or was stopped, causing service unavailability.",
            "confidence": 95,
            "alternative_causes": [
                "Process crashed due to fatal exception",
                "OOM-killer terminated the container",
                "Manual Docker stop command was issued",
            ],
            "recommendation": f"Start or restart the container to restore availability. Grounded in Synexis Runbook: {rag_chunks[0]['title'] if rag_chunks else 'Container Recovery'}.",
            "structured_actions": [
                {
                    "action": "start_container" if any(c["status"] == "exited" for c in containers if c["name"] == target_name) else "restart_container",
                    "target": target_name,
                    "reason": f"Restores the stopped '{target_name}' container to healthy running state.",
                }
            ],
        }

    if rule_id == "error_burst" or (logs and len(logs) >= 3):
        return {
            "root_cause": f"Rapid burst of application errors detected in {target_name} log stream (connection refused or internal 5xx faults).",
            "confidence": 90,
            "alternative_causes": [
                "Upstream database connection exhaustion",
                "Transient network partition between containers",
                "Malformed request payloads",
            ],
            "recommendation": f"Restart '{target_name}' to flush connection pools and clear faulted state. Follow runbook: {rag_chunks[0]['title'] if rag_chunks else 'Database Connection Recovery'}.",
            "structured_actions": [
                {
                    "action": "restart_container",
                    "target": target_name,
                    "reason": f"Flushes stale connection pool handles and restores '{target_name}'.",
                }
            ],
        }

    if rule_id == "cpu_sustained_high" or system.get("cpu_percent", 0) > 80:
        return {
            "root_cause": f"High compute load detected on {target_name} or host machine exceeding 80% threshold.",
            "confidence": 85,
            "alternative_causes": [
                "Unbounded API retry storm",
                "CPU-intensive spin loop in request handler",
                "Thread starvation across worker processes",
            ],
            "recommendation": f"Restart container to terminate runaway CPU spin loops and throttle incoming traffic.",
            "structured_actions": [
                {
                    "action": "restart_container",
                    "target": target_name,
                    "reason": f"Terminates CPU-intensive worker threads in '{target_name}'.",
                }
            ],
        }

    if rule_id == "memory_high":
        return {
            "root_cause": f"Memory utilization exceeded threshold in {target_name}, creating risk of Linux kernel OOMKilled (Exit 137).",
            "confidence": 85,
            "alternative_causes": [
                "Application memory leak in heap cache",
                "Unbounded buffer allocation",
                "Insufficient cgroup memory limit",
            ],
            "recommendation": "Restart container to release allocated heap buffers and increase memory limit if recurring.",
            "structured_actions": [
                {
                    "action": "restart_container",
                    "target": target_name,
                    "reason": f"Frees allocated memory buffers in '{target_name}'.",
                }
            ],
        }

    # Default fallback
    return {
        "root_cause": "Insufficient telemetry anomaly patterns to determine definitive root cause without AI analysis.",
        "confidence": None,
        "alternative_causes": [],
        "recommendation": "Configure GEMINI_API_KEY or OPENAI_API_KEY in .env for advanced generative multi-modal reasoning.",
        "structured_actions": [],
    }


class AIRCAEngine:
    """
    Evidence-based Root Cause Analysis engine with RAG knowledge integration.
    """

    def analyze_incident(self, incident_id: Optional[str] = None) -> dict[str, Any]:
        """
        Analyze an active or ad-hoc incident:
        1. Collect real telemetry evidence bundle
        2. Query RAG Knowledge Base for matching runbooks & past lessons
        3. Invoke LLM (or rule-augmented fallback)
        4. Validate safety of suggested actions
        5. Persist analysis to database
        """
        bundle = _collect_evidence_bundle(incident_id)

        # ── 1. RAG Knowledge Retrieval ────────────────────────────────────────
        query_parts = [
            bundle.get("incident_title", ""),
            bundle.get("incident_rule", ""),
            bundle.get("incident_service", ""),
        ]
        for err in bundle.get("recent_error_logs", [])[:3]:
            query_parts.append(err.get("message", "")[:100])

        rag_query = " ".join([p for p in query_parts if p]).strip()
        if not rag_query:
            rag_query = "container system performance health troubleshooting"

        rag_sources = rag_engine.retrieve(query=rag_query, top_k=3, min_score=0.05)

        # ── 2. Run LLM or Rule Reasoning ──────────────────────────────────────
        analysis_result: dict[str, Any] = {}
        model_used = "rules-only (no AI provider configured)"

        if settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 10:
            try:
                analysis_result = self._call_gemini(bundle, rag_sources)
                model_used = "gemini-1.5-flash (with RAG grounding)"
            except Exception:
                analysis_result = _rules_fallback_analysis(bundle, rag_sources)
        elif settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY) > 10:
            try:
                analysis_result = self._call_openai(bundle, rag_sources)
                model_used = "gpt-4o-mini (with RAG grounding)"
            except Exception:
                analysis_result = _rules_fallback_analysis(bundle, rag_sources)
        else:
            analysis_result = _rules_fallback_analysis(bundle, rag_sources)

        # ── 3. Action Safety Allowlist Filter ──────────────────────────────────
        safe_actions: list[dict[str, Any]] = []
        for action in analysis_result.get("structured_actions", []):
            act_type = action.get("action")
            act_target = action.get("target", "")
            if (
                act_type in ALLOWED_ACTIONS
                and act_target.startswith("synexis-")
            ):
                safe_actions.append(action)

        analysis_result["structured_actions"] = safe_actions
        analysis_result["model_used"] = model_used
        analysis_result["rag_sources"] = rag_sources
        analysis_result["timestamp"] = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        # ── 4. Persist to Database if incident_id exists ───────────────────────
        if incident_id:
            try:
                with db_session() as db:
                    analysis_row = AIAnalysis(
                        incident_id=incident_id,
                        model_used=model_used,
                        root_cause=analysis_result.get("root_cause", ""),
                        confidence=analysis_result.get("confidence"),
                        alternative_causes=analysis_result.get("alternative_causes", []),
                        recommendation=analysis_result.get("recommendation", ""),
                        structured_actions=safe_actions,
                        rag_sources=[
                            {"title": s["title"], "score": s["score"], "category": s["category"]}
                            for s in rag_sources
                        ],
                        raw_response=json.dumps(analysis_result),
                        created_at=datetime.now(timezone.utc),
                    )
                    db.add(analysis_row)
                    db.commit()
            except Exception:
                pass

        return {
            "incident_id": incident_id or "adhoc",
            "timestamp": analysis_result["timestamp"],
            "status": "ANALYZED",
            "model_used": model_used,
            "root_cause": analysis_result.get("root_cause", "No anomaly detected."),
            "confidence": analysis_result.get("confidence"),
            "alternative_causes": analysis_result.get("alternative_causes", []),
            "recommendation": analysis_result.get("recommendation", ""),
            "structured_actions": safe_actions,
            "rag_sources": rag_sources,
            "evidence_summary": f"Analyzed {len(bundle.get('db_evidence', []))} evidence records and {len(rag_sources)} RAG knowledge documents.",
            "evidence_bundle": {
                "system": bundle["system"],
                "containers": bundle["containers"],
                "log_stats": bundle["log_stats"],
                "error_samples": bundle["recent_error_logs"],
                "collected_evidence": bundle["db_evidence"],
            },
        }

    # ── LLM Connectors ────────────────────────────────────────────────────────

    def _call_gemini(
        self, bundle: dict[str, Any], rag_sources: list[dict[str, Any]]
    ) -> dict[str, Any]:
        import httpx

        rag_context = "\n\n".join([
            f"### [RAG Knowledge Citation: {s['title']} ({s['category']})]\n{s['content']}"
            for s in rag_sources
        ])

        user_content = f"""Live Telemetry Evidence Bundle:
{json.dumps(bundle, indent=2)}

Retrieved Synexis RAG Runbooks & Diagnostic Guides:
{rag_context}

Analyze the incident and return the requested JSON."""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": _SYSTEM_PROMPT},
                        {"text": user_content},
                    ]
                }
            ],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
        }

        with httpx.Client(timeout=12.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                raw = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(raw)
            else:
                raise RuntimeError(f"Gemini API returned status {resp.status_code}: {resp.text}")

    def _call_openai(
        self, bundle: dict[str, Any], rag_sources: list[dict[str, Any]]
    ) -> dict[str, Any]:
        import httpx

        rag_context = "\n\n".join([
            f"### [RAG Knowledge Citation: {s['title']} ({s['category']})]\n{s['content']}"
            for s in rag_sources
        ])

        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Telemetry:\n{json.dumps(bundle)}\n\nRAG Knowledge:\n{rag_context}",
                },
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }

        with httpx.Client(timeout=12.0) as client:
            resp = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                json=payload,
            )
            if resp.status_code == 200:
                data = resp.json()
                raw = data["choices"][0]["message"]["content"]
                return json.loads(raw)
            else:
                raise RuntimeError(f"OpenAI API returned status {resp.status_code}: {resp.text}")


ai_rca_engine = AIRCAEngine()
