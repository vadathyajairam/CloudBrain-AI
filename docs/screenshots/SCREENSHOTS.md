# Synexis Platform — Visual Evidence & Operational Walkthrough

This document catalogs the **13 verified operational states** of **Synexis** (*Intelligent System Analysis and Automation Platform*).

The visual captures follow one continuous, real-time SRE lifecycle:
```
HEALTHY SYSTEM ➔ CONTROLLED OUTAGE ➔ ANOMALY DETECTION ➔ EVIDENCE BUNDLE ➔
VECTOR RAG RETRIEVAL ➔ AI RCA DIAGNOSIS ➔ OPERATOR APPROVAL ➔ REAL REMEDIATION ➔
4-POINT HEALTH VERIFICATION ➔ INCIDENT RESOLUTION ➔ PERMANENT AUDIT LOGGING
```

---

## 1. Visual Evidence Catalog

| # | Screenshot Title | Operational State Demonstrated | Vector Asset Link |
| :---: | :--- | :--- | :--- |
| **01** | **Live Infrastructure Dashboard** | Multi-metric host & sandbox cluster telemetry | [`01-dashboard.svg`](./01-dashboard.svg) |
| **02** | **Container Monitoring Console** | High-density SRE table of `synexis-*` containers | [`02-containers.svg`](./02-containers.svg) |
| **03** | **Live Log Stream Explorer** | Real-time multi-service streaming log ingestion | [`03-logs.svg`](./03-logs.svg) |
| **04** | **Automatic Incident Detection** | Background anomaly rule triggers `INC-00042` | [`04-incident-detection.svg`](./04-incident-detection.svg) |
| **05** | **Multi-Modal Evidence Bundle** | Correlated container state, metrics, and error logs | [`05-evidence.svg`](./05-evidence.svg) |
| **06** | **Vector RAG Knowledge Retrieval** | Dense vector cosine similarity matching of `RUNBOOK-DB-03` | [`06-rag.svg`](./06-rag.svg) |
| **07** | **AI Root Cause Analysis (RCA)** | Grounded diagnostic reasoning and structured action | [`07-ai-rca.svg`](./07-ai-rca.svg) |
| **08** | **Human-in-the-Loop Operator Gate** | Role authorization (`sre_operator`) with Reject/Approve | [`08-approval.svg`](./08-approval.svg) |
| **09** | **Real 4-Point Health Verification** | Process, healthcheck, HTTP probe, and log quiescence checks | [`09-verification.svg`](./09-verification.svg) |
| **10** | **Verified Incident Resolution** | Transition to `RESOLVED` and post-mortem indexing | [`10-resolved.svg`](./10-resolved.svg) |
| **11** | **Compliance Audit Trail** | Immutable audit log record in database table `audit_logs` | [`11-audit.svg`](./11-audit.svg) |
| **12** | **Data Sources & Provenance** | Active local host, Docker SDK, and DB connections | [`12-data-sources.svg`](./12-data-sources.svg) |
| **13** | **DevOps AI Copilot** | Grounded Q&A over live incident, logs, and RAG knowledge | [`13-copilot.svg`](./13-copilot.svg) |

---

## 2. Detailed Screenshot Walkthrough

### Screenshot 01 — Live Infrastructure Dashboard
- **Asset**: [`docs/screenshots/01-dashboard.svg`](./01-dashboard.svg)
- **Purpose**: Displays real-time host telemetry (CPU %, memory allocation, disk space, network I/O) via `psutil`, live SVG resource charts, subsystem health matrix, and Docker container fleet summary.
- **Key Details**: Explicit provenance badges (`Source: Local Host (psutil)`, `Source: Docker Engine SDK`), real-time 3-second buffer stream.

---

### Screenshot 02 — Container Monitoring Console
- **Asset**: [`docs/screenshots/02-containers.svg`](./02-containers.svg)
- **Purpose**: High-density SRE table providing container name, Docker image, operational status, native health check, CPU %, memory usage against ceiling limits, restart counts, uptime, and lifecycle controls.
- **Key Details**: Restricted strictly to `synexis-*` containers (`synexis-demo-app`, `synexis-postgres`, `synexis-redis`).

---

### Screenshot 03 — Live Log Stream Explorer
- **Asset**: [`docs/screenshots/03-logs.svg`](./03-logs.svg)
- **Purpose**: Multi-service log viewer with filtering by container, log level (`INFO`, `WARNING`, `ERROR`, `CRITICAL`), text search, and automated error clustering.
- **Key Details**: Real log lines showing normal startup and subsequent connection refusal errors when the database daemon halts.

---

### Screenshot 04 — Automatic Incident Detection
- **Asset**: [`docs/screenshots/04-incident-detection.svg`](./04-incident-detection.svg)
- **Purpose**: Demonstrates sub-3-second automatic failure detection when `synexis-postgres` is stopped.
- **Key Details**: Rule `container_stopped` triggers `INC-00042` with `CRITICAL` severity and status `DETECTED` $\to$ `INVESTIGATING` in the persistent database.

---

### Screenshot 05 — Multi-Modal Evidence Collection
- **Asset**: [`docs/screenshots/05-evidence.svg`](./05-evidence.svg)
- **Purpose**: Gathers correlated evidence: container process state (`exited`, exit code 137), CPU drop to 0%, HTTP probe failure (503 Service Unavailable), and `psycopg2` connection refusal traces from `synexis-demo-app`.

---

### Screenshot 06 — Vector RAG Knowledge Retrieval
- **Asset**: [`docs/screenshots/06-rag.svg`](./06-rag.svg)
- **Purpose**: 128-dimensional dense vector embedding space projects incident symptoms and performs hybrid ranking ($0.60 \times \text{CosineSim} + 0.40 \times \text{BM25}$).
- **Key Details**: Retrieves `RUNBOOK-DB-03: PostgreSQL Database Connection Failure & Pool Exhaustion` with a **91.2% relevance score**.

---

### Screenshot 07 — AI Root Cause Analysis (RCA)
- **Asset**: [`docs/screenshots/07-ai-rca.svg`](./07-ai-rca.svg)
- **Purpose**: Fuses evidence bundle and retrieved runbook citations into Gemini / deterministic rule fallback engine.
- **Key Details**: Produces structured JSON output containing root cause, 95% confidence score, ruled-out alternatives, operator recommendation, and structured action (`restart_container` on `synexis-postgres`).

---

### Screenshot 08 — Human-in-the-Loop Operator Gate
- **Asset**: [`docs/screenshots/08-approval.svg`](./08-approval.svg)
- **Purpose**: Safety gate requiring role authorization (`sre_operator` or `admin`). Proves AI cannot execute arbitrary shell commands.
- **Key Details**: Displays proposed action, risk level, allowlist validation check, and operator `[Reject]` and `[Approve & Execute Fix]` controls.

---

### Screenshot 09 — Real 4-Point Health Verification
- **Asset**: [`docs/screenshots/09-verification.svg`](./09-verification.svg)
- **Purpose**: Evaluates 4 multi-layered health probes post-remediation:
  1. Docker Process State: `RUNNING`
  2. Native Docker Healthcheck: `HEALTHY` (`pg_isready` exit code 0)
  3. Microservice HTTP Probe: HTTP 200 OK
  4. Error Log Quiescence: 0 errors in 30-second window
- **Key Details**: All 4 checks display **PASSED**.

---

### Screenshot 10 — Verified Incident Resolution
- **Asset**: [`docs/screenshots/10-resolved.svg`](./10-resolved.svg)
- **Purpose**: Incident transitions to state `RESOLVED` in the database.
- **Key Details**: Resolution summary recorded, post-mortem vectorized and indexed into RAG as `IncidentLesson #INC-00042`.

---

### Screenshot 11 — Compliance Audit Trail
- **Asset**: [`docs/screenshots/11-audit.svg`](./11-audit.svg)
- **Purpose**: Immutable compliance log recorded in database table `audit_logs`.
- **Key Details**: Records timestamp, actor identity (`sre_operator`), role (`admin`), action type, target container, approval status, execution result, and 4-point verification outcome.

---

### Screenshot 12 — Data Sources & Provenance
- **Asset**: [`docs/screenshots/12-data-sources.svg`](./12-data-sources.svg)
- **Purpose**: Transparent matrix showing connected subsystems (Local Host, Docker SDK, PostgreSQL, Vector RAG Store, AI Provider) and explicitly marking unconfigured cloud services (AWS, Kubernetes) as `NOT CONNECTED`.

---

### Screenshot 13 — DevOps AI Copilot
- **Asset**: [`docs/screenshots/13-copilot.svg`](./13-copilot.svg)
- **Purpose**: Conversational assistant answering operator queries (*"Why did PostgreSQL fail during the latest incident?"*).
- **Key Details**: Answer is strictly grounded in live incident telemetry, error logs, and `RUNBOOK-DB-03` citations rather than generic LLM pre-training weights.
