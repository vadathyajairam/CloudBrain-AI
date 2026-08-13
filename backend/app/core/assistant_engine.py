"""
assistant_engine.py  —  Synexis AI DevOps Copilot with RAG & Live Observability

Architecture:
  User Question
       ↓
  Live Telemetry (Host CPU/RAM/Disk, Docker Containers, Recent Error Logs)
       +
  RAG Knowledge Retrieval (Curated Runbooks + Historical Resolved Incident Lessons)
       +
  Incident History (Active & Recent Resolved Incidents)
       ↓
  LLM (Gemini primary / OpenAI secondary / Synexis Expert Rule Engine)
       ↓
  Grounded, Actionable DevOps Diagnostic & Remediation Guidance
"""
from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from backend.app.config import settings
from backend.app.core.ai_rca_engine import ai_rca_engine
from backend.app.core.container_engine import container_engine
from backend.app.core.log_engine import log_engine
from backend.app.core.monitoring import monitoring_engine
from backend.app.core.rag_engine import rag_engine
from backend.app.database import db_session
from backend.app.database.models import Incident


class AssistantEngine:
    def __init__(self) -> None:
        self.chat_history: List[Dict[str, Any]] = [
            {
                "role": "assistant",
                "content": (
                    "👋 Hello! I am **Synexis AI**, your intelligent System Analysis & Automation Copilot. "
                    "I am connected to your live system telemetry, Docker container cluster, logs, and "
                    "RAG Knowledge Base (runbooks & historical incident lessons).\n\n"
                    "Ask me anything about your infrastructure or troubleshooting:\n"
                    "- *\"Why is the application running slowly?\"*\n"
                    "- *\"Check container statuses and restart counts\"*\n"
                    "- *\"What caused the latest error in the logs?\"*\n"
                    "- *\"How do I resolve high CPU utilization or OOM kills?\"*\n"
                    "- *\"Audit our Docker Compose security posture\"*"
                ),
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "rag_sources": [],
            }
        ]

    def _get_recent_incidents(self) -> List[Dict[str, Any]]:
        try:
            with db_session() as db:
                rows = db.query(Incident).order_by(Incident.detected_at.desc()).limit(5).all()
                return [
                    {
                        "id": inc.id,
                        "title": inc.title,
                        "severity": inc.severity,
                        "status": inc.status,
                        "service": inc.service,
                    }
                    for inc in rows
                ]
        except Exception:
            return []

    def _call_gemini(
        self,
        user_msg: str,
        metrics: Any,
        containers: Any,
        rca: Any,
        errors: Any,
        rag_sources: List[Dict[str, Any]],
        incidents: List[Dict[str, Any]],
    ) -> str:
        rag_text = "\n\n".join([
            f"### [RAG Document: {s['title']} ({s['category']})]\n{s['content']}"
            for s in rag_sources
        ])

        prompt = f"""You are Synexis AI, an expert Senior Site Reliability Engineer & DevOps Copilot.

LIVE SYSTEM TELEMETRY:
- Host CPU: {metrics['cpu']['usage_percent']}% ({metrics['cpu']['core_count']} Cores)
- Host Memory: {metrics['memory']['usage_percent']}% ({metrics['memory']['used_gb']}GB / {metrics['memory']['total_gb']}GB)
- Disk Usage: {metrics['disk']['usage_percent']}% ({metrics['disk']['free_gb']}GB free)
- Health Score: {metrics['health_score']}/100 ({metrics['status']})
- Docker Containers: {[{'name': c['name'], 'status': c['status'], 'cpu': c['cpu_percent'], 'mem_mb': c['memory_mb'], 'restarts': c['restart_count']} for c in containers]}
- Active Incidents: {incidents}
- Current RCA Analysis: Status={rca.get('status')} | Root Cause={rca.get('root_cause')} | Actions={rca.get('structured_actions')}
- Recent Log Errors: {[{'service': e['service'], 'level': e['level'], 'message': e['message']} for e in errors]}

RETRIEVED RAG KNOWLEDGE & RUNBOOKS:
{rag_text if rag_text else 'No specific runbook match.'}

USER QUESTION:
{user_msg}

Answer clearly and concisely in GitHub markdown with bullet points, diagnostic explanations grounded in the RAG knowledge and live telemetry, and actionable remediation steps."""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
            else:
                raise RuntimeError(f"Gemini API error: {resp.text}")

    def _call_openai(
        self,
        user_msg: str,
        metrics: Any,
        containers: Any,
        rca: Any,
        errors: Any,
        rag_sources: List[Dict[str, Any]],
        incidents: List[Dict[str, Any]],
    ) -> str:
        rag_text = "\n\n".join([
            f"### [RAG Document: {s['title']} ({s['category']})]\n{s['content']}"
            for s in rag_sources
        ])

        system_content = (
            "You are Synexis AI, an expert Senior DevOps & SRE Copilot. "
            "Use live telemetry, Docker container states, and retrieved RAG runbooks to answer questions accurately."
        )
        user_content = f"""Telemetry:
- CPU: {metrics['cpu']['usage_percent']}% | Memory: {metrics['memory']['usage_percent']}% | Score: {metrics['health_score']}/100
- Containers: {len(containers)} monitored
- Incidents: {incidents}
- Recent Errors: {errors}

RAG Knowledge:
{rag_text}

User Question: {user_msg}"""

        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.2,
        }

        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                json=payload,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            else:
                raise RuntimeError(f"OpenAI API error: {resp.text}")

    def process_message(self, user_message: str) -> Dict[str, Any]:
        now_time = datetime.now().strftime("%H:%M:%S")

        # 1. Fetch live context
        metrics = monitoring_engine.get_latest()
        containers = container_engine.list_containers()
        rca = ai_rca_engine.analyze_incident()
        recent_errors = [
            l for l in log_engine.get_logs(limit=15)
            if l["level"] in ("ERROR", "CRITICAL", "WARN")
        ]
        recent_incidents = self._get_recent_incidents()

        # 2. Query RAG Knowledge Base
        rag_sources = rag_engine.retrieve(user_message, top_k=3, min_score=0.05)

        # Append user message
        self.chat_history.append({
            "role": "user",
            "content": user_message,
            "timestamp": now_time,
            "rag_sources": [],
        })

        # 3. Call LLM if keys configured
        if settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 10:
            try:
                reply = self._call_gemini(
                    user_message, metrics, containers, rca, recent_errors, rag_sources, recent_incidents
                )
                res_obj = {
                    "role": "assistant",
                    "content": reply,
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    "rag_sources": rag_sources,
                }
                self.chat_history.append(res_obj)
                return res_obj
            except Exception:
                pass

        if settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY) > 10:
            try:
                reply = self._call_openai(
                    user_message, metrics, containers, rca, recent_errors, rag_sources, recent_incidents
                )
                res_obj = {
                    "role": "assistant",
                    "content": reply,
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    "rag_sources": rag_sources,
                }
                self.chat_history.append(res_obj)
                return res_obj
            except Exception:
                pass

        # 4. Built-in Expert Reasoning Engine with RAG Grounding
        msg_lower = user_message.lower()
        reply_content = ""

        rca_root = rca.get("root_cause", "No issues detected.")
        rca_conf = rca.get("confidence")
        rca_rec = rca.get("recommendation", "")
        rca_actions = rca.get("structured_actions", [])
        is_incident = bool(rca_actions) or rca_conf is not None

        # Diagnosis / Performance Questions
        if any(w in msg_lower for w in ["slow", "latency", "why is", "high load", "spike", "problem", "failing", "error", "down", "outage", "postgres", "database"]):
            if is_incident:
                conf_str = f"`{rca_conf}%`" if rca_conf is not None else "`Rule-analyzed`"
                reply_content = (
                    f"### 🔍 Synexis Diagnostic Report\n\n"
                    f"**Probable Root Cause:** {rca_root}\n\n"
                    f"**Confidence:** {conf_str} | **Model:** `{rca.get('model_used', 'rules-only')}`\n\n"
                    f"**Recommendation:** {rca_rec}\n\n"
                )
                if rag_sources:
                    reply_content += f"**Grounded in RAG Runbook:** *{rag_sources[0]['title']}*\n\n"
                if rca_actions:
                    reply_content += "**Proposed Remediation Actions:**\n"
                    for a in rca_actions[:3]:
                        reply_content += f"- **{a.get('action', '')}** on `{a.get('target', '')}` — {a.get('reason', '')}\n"
                    reply_content += "\n*Approve and execute safely in the **Remediation Console** tab!*"
            else:
                top_rb = f"\n\n*Referenced Runbook: {rag_sources[0]['title']}*" if rag_sources else ""
                reply_content = (
                    f"### ✅ Infrastructure Status: Healthy & Operational\n\n"
                    f"Live Telemetry Overview:\n"
                    f"- **Host CPU:** `{metrics['cpu']['usage_percent']}%` ({metrics['cpu']['core_count']} cores)\n"
                    f"- **Memory:** `{metrics['memory']['usage_percent']}%` ({metrics['memory']['used_gb']} GB / {metrics['memory']['total_gb']} GB)\n"
                    f"- **Disk Free:** `{metrics['disk']['free_gb']} GB`\n"
                    f"- **Monitored Containers:** `{len(containers)}` active services.\n\n"
                    f"No active outages detected. You can simulate a live failure in the **Chaos Sandbox Lab** to see automated detection & RCA in action!{top_rb}"
                )

        # Docker / Container Status Questions
        elif any(w in msg_lower for w in ["container", "docker", "service", "status", "restarts", "restart count"]):
            if not containers:
                reply_content = (
                    "### 🐳 Docker Sandbox Telemetry\n\n"
                    "Currently, **Docker is offline** or no `synexis-*` containers were discovered. "
                    "Start Docker Desktop and launch the sandbox (`cd sandbox && docker compose up -d`) to enable live container tracking."
                )
            else:
                reply_content = "### 🐳 Monitored Container Fleet Status\n\n"
                for c in containers:
                    status_badge = "🟢" if c["status"] == "running" else "🔴"
                    reply_content += (
                        f"- {status_badge} **`{c['name']}`**: `{c['status']}` | CPU: `{c['cpu_percent']}%` | "
                        f"Memory: `{c['memory_mb']} MB` | Restarts: `{c['restart_count']}` | Uptime: `{c['uptime']}`\n"
                    )
                reply_content += "\nAll metrics collected via live Docker Engine SDK."

        # RAG / Knowledge Base Questions
        elif any(w in msg_lower for w in ["rag", "runbook", "knowledge", "guide", "documentation", "troubleshoot"]):
            reply_content = (
                f"### 📚 Synexis RAG Knowledge Base\n\n"
                f"Synexis indexes curated DevOps runbooks and automatically indexes resolved incident lessons for continuous learning.\n\n"
                f"**Top matching runbooks for your query:**\n"
            )
            if rag_sources:
                for s in rag_sources:
                    reply_content += f"- 📖 **{s['title']}** (Category: `{s['category']}`, Score: `{s['score']}`)\n"
            else:
                reply_content += "- *PostgreSQL Connection Exhaustion & OperationalError*\n- *High CPU Utilization & Spin Loops*\n- *Container OOMKilled (Exit Code 137)*\n- *HTTP 504 Gateway Timeout & Latency*\n- *Container Unexpected Exit Recovery*\n"

        # General / Catch-all
        else:
            rag_ref = f"\n\n*Matched Knowledge:* `{rag_sources[0]['title']}`" if rag_sources else ""
            reply_content = (
                f"### 🤖 Synexis AI Observability Snapshot\n\n"
                f"- **System Health Score:** `{metrics['health_score']}/100` ({metrics['status']})\n"
                f"- **Monitored Containers:** `{len(containers)}` active\n"
                f"- **Compute Telemetry:** Host CPU `{metrics['cpu']['usage_percent']}%` | RAM `{metrics['memory']['usage_percent']}%`\n"
                f"- **Active Incidents:** `{len([i for i in recent_incidents if i['status'] not in ('RESOLVED', 'CLOSED')])}` open\n\n"
                f"**You can ask me to:**\n"
                f"1. *\"Diagnose active incident\"* — explains root causes and evidence.\n"
                f"2. *\"Inspect container resource usage\"* — gives resource breakdown.\n"
                f"3. *\"Search runbooks for PostgreSQL or CPU issues\"* — retrieves RAG troubleshooting guides.\n"
                f"4. *\"Explain remediation plan\"* — details safe human-in-the-loop fix actions.{rag_ref}"
            )

        res_obj = {
            "role": "assistant",
            "content": reply_content,
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "rag_sources": rag_sources,
        }
        self.chat_history.append(res_obj)
        return res_obj


assistant_engine = AssistantEngine()
