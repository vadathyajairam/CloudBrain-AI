import os
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime

from backend.app.config import settings
from backend.app.core.monitoring import monitoring_engine
from backend.app.core.container_engine import container_engine
from backend.app.core.log_engine import log_engine
from backend.app.core.ai_rca_engine import ai_rca_engine

class AssistantEngine:
    def __init__(self):
        self.chat_history: List[Dict[str, Any]] = [
            {
                "role": "assistant",
                "content": "👋 Hello! I am **CloudBrain AI**, your intelligent Cloud & DevOps Assistant. I am continuously monitoring your system metrics, container health, application logs, and configurations.\n\nAsk me anything about your infrastructure, or try:\n- *\"Why is the application running slowly?\"*\n- *\"Check container statuses & restart history\"*\n- *\"What caused the latest error in the logs?\"*\n- *\"How do I resolve high CPU utilization?\"*\n- *\"Generate a secure multi-stage Dockerfile\"*",
                "timestamp": datetime.now().strftime("%H:%M:%S")
            }
        ]

    def _call_gemini(self, user_msg: str, metrics: Any, containers: Any, rca: Any, errors: Any) -> str:
        prompt = f"""You are CloudBrain AI, an expert Senior DevOps & Cloud Infrastructure Engineer and AI Assistant.
Live System Observability Telemetry:
- Host CPU Usage: {metrics['cpu']['usage_percent']}% ({metrics['cpu']['core_count']} Cores)
- Host Memory Usage: {metrics['memory']['usage_percent']}% ({metrics['memory']['used_gb']}GB / {metrics['memory']['total_gb']}GB)
- Disk Usage: {metrics['disk']['usage_percent']}%
- Containers: {[{'name': c['name'], 'status': c['status'], 'cpu': c['cpu_percent'], 'memory': c['memory_mb'], 'restarts': c['restart_count']} for c in containers]}
- Active Incident Status: {rca['status']} | Title: {rca['title']} | Severity: {rca['severity']} | Root Cause: {rca.get('probable_root_cause', 'None')}
- Recent Log Errors: {[{'service': e['service'], 'level': e['level'], 'message': e['message']} for e in errors]}

User Question: {user_msg}

Answer clearly, concisely, with actionable DevOps solutions, formatted in GitHub markdown with bullet points and code blocks where applicable."""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
            else:
                raise RuntimeError(f"Gemini API error: {resp.text}")

    def process_message(self, user_message: str) -> Dict[str, Any]:
        now_time = datetime.now().strftime("%H:%M:%S")
        
        # Save user message
        self.chat_history.append({
            "role": "user",
            "content": user_message,
            "timestamp": now_time
        })

        # 1. Fetch current live context
        metrics = monitoring_engine.get_latest()
        containers = container_engine.list_containers()
        rca = ai_rca_engine.analyze_incident()
        recent_errors = [l for l in log_engine.get_logs(limit=15) if l["level"] in ("ERROR", "CRITICAL", "WARN")]

        # 2. Check if external LLM API is available and configured
        if settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 10:
            try:
                reply = self._call_gemini(user_message, metrics, containers, rca, recent_errors)
                self.chat_history.append({"role": "assistant", "content": reply, "timestamp": datetime.now().strftime("%H:%M:%S")})
                return {"role": "assistant", "content": reply, "timestamp": datetime.now().strftime("%H:%M:%S")}
            except Exception:
                pass # fallback to built-in expert engine

        # 3. Built-in Comprehensive DevOps Knowledge & Reasoning Engine
        msg_lower = user_message.lower()
        reply_content = ""

        # Performance & Slowness Diagnosis
        if any(w in msg_lower for w in ["slow", "latency", "why is", "high load", "spike", "problem", "failing", "error", "down", "outage"]):
            if rca["status"] != "HEALTHY":
                reply_content = (
                    f"### 🔍 Diagnostic Report: {rca['title']}\n\n"
                    f"I analyzed your live telemetry signals across host compute, containers, and log streams.\n\n"
                    f"**Problem Detected:** {rca['detected_issue']}\n\n"
                    f"**Probable Root Cause:**\n{rca['probable_root_cause']}\n\n"
                    f"**Confidence Score:** `{rca['confidence_score']}%` | **Severity:** `{rca['severity']}`\n\n"
                    f"**Key Correlated Evidence:**\n"
                )
                for ev in rca["evidence_chain"][:4]:
                    reply_content += f"- **[{ev['type']}]** {ev['detail']}\n"
                
                reply_content += "\n**Recommended Remediation Actions:**\n"
                for idx, act in enumerate(rca["recommended_actions"], 1):
                    reply_content += f"{idx}. **{act['title']}**\n   `{act['command']}` (Risk Level: `{act['risk_level']}`)\n"

                reply_content += "\n*You can approve and execute these actions safely in the **Incidents** or **AI Root Cause (RCA)** tab!*"
            else:
                reply_content = (
                    f"### ✅ Infrastructure Status: All Systems Operational\n\n"
                    f"I reviewed your live telemetry:\n"
                    f"- **Host CPU Utilization:** `{metrics['cpu']['usage_percent']}%` ({metrics['cpu']['core_count']} cores)\n"
                    f"- **Memory Footprint:** `{metrics['memory']['usage_percent']}%` ({metrics['memory']['used_gb']} GB / {metrics['memory']['total_gb']} GB)\n"
                    f"- **Disk Available:** `{metrics['disk']['free_gb']} GB`\n"
                    f"- **Containers:** All `{len(containers)}` services are in `healthy` and `running` state.\n\n"
                    f"No active bottlenecks or error bursts found in logs. To simulate a production failure, trigger a scenario from the **Chaos Sandbox Lab**!"
                )

        # Docker / Containers status & management
        elif any(w in msg_lower for w in ["container", "docker", "services", "status", "nodes"]):
            c_summary = "\n".join([f"- **{c['name']}**: `{c['status'].upper()}` ({c['state']}) | CPU: `{c['cpu_percent']}%` | RAM: `{c['memory_mb']} MB` | Restarts: `{c['restart_count']}`" for c in containers])
            reply_content = (
                f"### 🐳 Live Container Services Status ({len(containers)} Nodes)\n\n"
                f"{c_summary}\n\n"
                f"**Quick Management Commands:**\n"
                f"- Restart backend: `docker restart cloudbrain-api-backend`\n"
                f"- Check logs: `docker logs -f --tail 50 <container_name>`\n"
                f"- Inspect stats: `docker stats`"
            )

        # Logs & Error analysis
        elif any(w in msg_lower for w in ["logs", "log", "recent", "trace"]):
            if recent_errors:
                err_list = "\n".join([f"- `[{l['timestamp']}]` `[{l['service']}]` **{l['level']}**: {l['message']}" for l in recent_errors[-5:]])
                reply_content = (
                    f"### 📜 Recent Log Anomalies Flagged\n\n"
                    f"Here are the latest error and warning traces detected by the Log Engine:\n\n"
                    f"{err_list}\n\n"
                    f"Would you like me to run an automated Root Cause Analysis on these traces?"
                )
            else:
                reply_content = "### 📜 Log Stream Status\n\nAll recent logs across `backend`, `frontend`, `database`, `redis`, and `worker` are informational with zero active error bursts."

        # Dockerfile / Compose writing assistance
        elif any(w in msg_lower for w in ["dockerfile", "compose", "yaml", "manifest", "k8s", "kubernetes"]):
            reply_content = (
                "### 🛠️ Production Best Practices for Docker & Kubernetes\n\n"
                "**1. Multi-Stage Dockerfile (Python Example):**\n"
                "```dockerfile\n"
                "FROM python:3.12-slim AS builder\n"
                "WORKDIR /app\n"
                "COPY requirements.txt .\n"
                "RUN pip install --no-cache-dir --user -r requirements.txt\n\n"
                "FROM python:3.12-slim\n"
                "RUN useradd -m appuser\n"
                "WORKDIR /app\n"
                "COPY --from=builder /root/.local /home/appuser/.local\n"
                "COPY --chown=appuser:appuser . /app\n"
                "USER appuser\n"
                "ENV PATH=/home/appuser/.local/bin:$PATH\n"
                "EXPOSE 8000\n"
                "CMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]\n"
                "```\n\n"
                "**2. Key Auditing Rules:**\n"
                "- Avoid running as `root` (use `USER appuser`)\n"
                "- Never hardcode secrets in `ENV` (use environment variables or secrets manager)\n"
                "- Define explicit resource `limits` and `requests` in K8s and Docker Compose"
            )

        # 504 / 502 / Gateway / Connection errors
        elif any(w in msg_lower for w in ["504", "502", "gateway", "connection refused", "timeout", "oom", "137"]):
            reply_content = (
                "### 🔧 Troubleshooting Common DevOps Errors\n\n"
                "- **HTTP 504 Gateway Timeout:** Upstream service took too long to respond. Check if the database connection pool is saturated, or if an unthrottled API retry loop is starving threads.\n"
                "- **HTTP 502 Bad Gateway:** Upstream container/process crashed or stopped listening on port. Verify with `docker ps` and check container logs.\n"
                "- **Exit Code 137 (OOMKilled):** Container exceeded its memory cgroup limit and received `SIGKILL` from Linux kernel OOM Killer. Solution: Increase memory limit or fix memory leaks in heap objects.\n"
                "- **Errno 98 (Address in use):** Port conflict. Solution: Find listening PID using `lsof -i :<port>` or `netstat -ano` and terminate the orphaned process."
            )

        # General / Catch-all
        else:
            reply_content = (
                f"### 🤖 CloudBrain AI Observability Snapshot\n\n"
                f"- **System Health Score:** `{metrics['health_score']}/100` ({metrics['status']})\n"
                f"- **Active Containers:** `{len(containers)} running` (`cloudbrain-backend`, `frontend`, `database`, `redis`, `worker`)\n"
                f"- **Compute Telemetry:** Host CPU `{metrics['cpu']['usage_percent']}%` | RAM `{metrics['memory']['usage_percent']}%`\n"
                f"- **Current Incident Status:** `{rca['title']}` ({rca['status']})\n\n"
                f"**You can ask me to:**\n"
                f"1. *\"Diagnose active incident\"* — explains root causes and evidence.\n"
                f"2. *\"Inspect container memory & CPU\"* — gives resource breakdown.\n"
                f"3. *\"How do I fix database connection pool exhaustion?\"* — gives step-by-step remediation commands.\n"
                f"4. *\"Audit my Dockerfile / docker-compose.yml\"* — checks for security flaws."
            )

        self.chat_history.append({
            "role": "assistant",
            "content": reply_content,
            "timestamp": datetime.now().strftime("%H:%M:%S")
        })

        return {
            "role": "assistant",
            "content": reply_content,
            "timestamp": datetime.now().strftime("%H:%M:%S")
        }

    def get_history(self) -> List[Dict[str, Any]]:
        return self.chat_history

    def clear_history(self):
        self.chat_history = self.chat_history[:1]

assistant_engine = AssistantEngine()
