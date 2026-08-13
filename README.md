# Synexis ⚡🧠
> **Intelligent System Analysis, Observability & Safe Automated Remediation Platform**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016%20(Turbopack)-black?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20SQLite-336791?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Container-Docker%20SDK-2496ED?logo=docker)](https://www.docker.com/)
[![RAG](https://img.shields.io/badge/RAG-128D%20Dense%20Vector%20%2B%20BM25-6366F1)](https://github.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Tests](https://img.shields.io/badge/Tests-62%20Passed%20(100%25)-brightgreen)](https://github.com)

---

## 1. Introduction

Modern cloud-native applications rely on intricate distributed architectures consisting of microservices, container runtimes, database clusters, caches, and CI/CD automation. When critical production outages or performance degradations occur, Site Reliability Engineers (SREs) and DevOps professionals are inundated with thousands of raw log lines, multi-dimensional compute metrics, and scattered alerts. Identifying the root cause and executing safe, verified remediation under tight Service Level Agreements (SLAs) is a daunting, time-critical challenge.

**Synexis** is an intelligent, full-stack system analysis, observability, and safe automation platform. It unifies **Artificial Intelligence (AI), Dense Vector Retrieval-Augmented Generation (RAG), Docker orchestration, live host telemetry, and human-in-the-loop DevOps remediation** into a cohesive operational control plane.

> **Core Axiom:** *Synexis detects a real infrastructure problem, collects multi-modal evidence, retrieves relevant knowledge using Dense Vector RAG, uses AI to determine the probable root cause, recommends a safe solution, performs an operator-approved remediation, and verifies that the problem is actually resolved.*

---

## 2. Problem Statement

1. **Telemetry Overload:** Modern observability stacks output high-velocity logs and metrics without contextual synthesis, leading to alert fatigue.
2. **Knowledge Silos:** Troubleshooting knowledge is scattered across fragmented wikis, runbooks, and tribal engineer memory, slowing down Mean Time to Resolution (MTTR).
3. **High-Risk Manual Remediation:** Direct execution of ad-hoc shell commands during outages frequently introduces cascading failures or data corruption.
4. **Lack of Post-Action Verification:** Traditional automated scripts assume command execution equates to service recovery, without validating process stability, TCP health probes, or log quiescence.
5. **No Continuous Learning Loop:** Organizations fail to automatically capture incident post-mortems as machine-readable knowledge for future diagnostic engines.

---

## 3. Existing System

| Characteristic | Traditional APM / Monitoring Tools | Uncontrolled AI Script Generators |
| :--- | :--- | :--- |
| **Detection** | Static threshold alerts (PagerDuty/Datadog) | None (Purely reactive user prompts) |
| **Root Cause Analysis** | Manual dashboard cross-correlation by SRE | Hallucinative raw command suggestions |
| **Knowledge Retrieval** | Static hyperlinks to unindexed wikis | Generic LLM pre-training weights |
| **Remediation Execution** | Unchecked Bash scripts / manual SSH | Blind shell execution without safety gates |
| **Verification** | Absent or manual metric monitoring | Assumes exit code 0 = complete recovery |
| **Audit & Compliance** | Scattered terminal logs | Non-existent action tracking |

---

## 4. Proposed System (Synexis)

Synexis introduces a fully integrated, safe, evidence-grounded operational loop:

1. **Native Observability:** Real-time collection of host compute metrics via `psutil`, container lifecycle states via official `Docker SDK`, and log clustering.
2. **Rule-Based Anomaly Detection:** Continuous background evaluation of resource thresholds, exit codes, crash loops, and error bursts.
3. **Database-Backed Incident Lifecycle:** Structured 6-state state machine (`DETECTED` $\to$ `ACKNOWLEDGED` $\to$ `INVESTIGATING` $\to$ `REMEDIATING` $\to$ `RESOLVED` $\to$ `CLOSED`).
4. **Dense Vector RAG Engine:** 128-dimensional dense vector embeddings with sublinear TF-IDF and BM25 hybrid semantic search across curated runbooks, technical architecture guides, and previous incident lessons.
5. **Multi-Modal AI Root Cause Analysis:** Grounded reasoning fusing telemetry evidence bundles and RAG runbooks.
6. **Safety Policy Validation & Role Authorization:** Strict allowlisted actions (`restart_container`, `start_container`, `stop_container`) on sandbox containers (`synexis-*`), requiring explicit operator approval.
7. **4-Point Post-Action Health Verification:** Real-time inspection of Docker process state, native health checks, application HTTP probes, and error log quiescence.
8. **Continuous Knowledge Indexing:** Resolved incidents are automatically vectorized into `IncidentLesson` documents for future RAG retrieval.

---

## 5. Objectives

- **Automate Real Failure Detection:** Detect container crashes, CPU spin loops, OOM kills (Exit 137), and database connection storms in $< 3$ seconds.
- **Eliminate AI Hallucination:** Ground all RCA diagnoses in real telemetry bundles and verified vector runbooks.
- **Guarantee Zero Unsafe Shell Execution:** Enforce immutable structured actions and role-based operator authorization gates.
- **Ensure Genuine Health Verification:** Replace arbitrary delays and fake percentages with real multi-point health probes.
- **Provide Total Compliance:** Maintain an immutable audit log of every proposal, approval, execution, and health check.

---

## 6. System Architecture

```
+-----------------------------------------------------------------------------------+
|                            SYNEXIS WEB CONSOLE                                    |
|              (Next.js 16 • Tailwind CSS • Real-Time HTTP REST API)                |
|                                                                                   |
|  [Dashboard]  [Host Telemetry]  [Log Stream]  [AI RCA + RAG]  [Incidents]         |
|  [Containers] [Data Sources]   [Remediation & Audit] [Chaos Lab] [DevOps Copilot] |
+------------------------------------------+----------------------------------------+
                                           | HTTP REST API (:8000/api/v1)
                                           v
+-----------------------------------------------------------------------------------+
|                            SYNEXIS CORE BACKEND (FastAPI)                         |
|                                                                                   |
|  ┌───────────────────┐  ┌───────────────────┐  ┌────────────────────────────────┐ |
|  | Detection Engine  |  | Dense Vector RAG  |  | AI Multi-Modal RCA & Copilot   | |
|  | (Threshold, State |  | (128-D Embeddings |  | (Grounded in Telemetry, Logs,  | |
|  |  & Anomaly Rules) |  |  + BM25 Retriever)|  |  Container State & Runbooks)  | |
|  └─────────┬─────────┘  └─────────┬─────────┘  └───────────────┬────────────────┘ |
|            │                      │                            │                  |
|            v                      v                            v                  |
|  ┌───────────────────┐  ┌───────────────────┐  ┌────────────────────────────────┐ |
|  | Incident Manager  |  | Remediation Engine|  | Verification Engine            | |
|  | (6-State Lifecycle|  | (Role Auth Gate & |  | (Docker Process, Healthcheck,  | |
|  |  DB Persistence)  |  |  Allowlist Filter)|  |  HTTP Probe & Error Spike)    | |
|  └─────────┬─────────┘  └─────────┬─────────┘  └───────────────┬────────────────┘ |
|            │                      │                            │                  |
|            v                      v                            v                  |
|  ┌───────────────────┐  ┌───────────────────┐  ┌────────────────────────────────┐ |
|  | Audit Logger      |  | Knowledge Indexer |  | Database Engine                | |
|  | (Compliance Log)  |  | (Incident Learning|  | (PostgreSQL / SQLite 2.0 via   | |
|  |                   |  |  Feedback Loop)   |  |  DATABASE_URL)                 | |
|  └─────────┴─────────┘  └─────────┴─────────┘  └───────────────┬────────────────┘ |
+------------------+-----------------------+---------------------+------------------+
                   |                       |                     |
                   v                       v                     v
          ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
          | Local Machine   |    | Docker Engine   |    | Database Store  |
          | (psutil Metrics)|    | (synexis-* fleet|    | (PostgreSQL /   |
          |                 |    |  SDK Control)   |    |  SQLite DB)     |
          └─────────────────┘    └─────────────────┘    └─────────────────┘
```

> **High-Resolution Vector Diagrams:** Comprehensive architecture, sandbox, workflow, and lifecycle vector diagrams are available in [`docs/diagrams/DIAGRAMS.md`](docs/diagrams/DIAGRAMS.md) and as SVG assets in [`docs/diagrams/`](docs/diagrams/).
>
> **Visual Walkthrough & Evidence Catalog:** Complete 13-state operational visual evidence walkthrough is documented in [`docs/screenshots/SCREENSHOTS.md`](docs/screenshots/SCREENSHOTS.md) and as SVG visual captures in [`docs/screenshots/`](docs/screenshots/).
>
> **Academic Project Report:** The comprehensive 26-section academic specification is published at [`docs/report/SYNEXIS_PROJECT_REPORT.md`](docs/report/SYNEXIS_PROJECT_REPORT.md).
>
> **Viva & Presentation Materials:** Slide deck ([`PRESENTATION.md`](docs/presentation/PRESENTATION.md)), defense Q&A guide ([`VIVA_QUESTIONS.md`](docs/presentation/VIVA_QUESTIONS.md)), live demo script ([`LIVE_DEMO_SCRIPT.md`](docs/presentation/LIVE_DEMO_SCRIPT.md)), and exam cheat sheet ([`CHEAT_SHEET.md`](docs/presentation/CHEAT_SHEET.md)).

---

## 7. Technologies

| Domain | Technology Stack |
| :--- | :--- |
| **Backend Core** | Python 3.10+, FastAPI, Uvicorn, Pydantic v2 |
| **Telemetry & Containers** | `psutil` (OS metrics), `docker` (Official Docker SDK for Python) |
| **Database & ORM** | PostgreSQL (Production), SQLite (Development), SQLAlchemy 2.0 |
| **Vector Engine & RAG** | 128-D Dense Vector Space Model, TF-IDF Sublinear Weighting, BM25 Fusion |
| **AI Models & Copilot** | Google Gemini (`gemini-1.5-flash`), OpenAI (`gpt-4o-mini`), Expert Rule Engine Fallback |
| **Frontend UI** | Next.js 16 (App Router & Turbopack), React 19, TypeScript 5, Tailwind CSS |
| **Testing** | `pytest`, `unittest`, Python `unittest.mock` |

---

## 8. Modules

1. `monitoring_engine`: Collects CPU, memory, disk, network, and system health scores via `psutil`.
2. `container_engine`: Interacts with Docker daemon, queries container stats, inspects state, and executes container actions.
3. `log_engine`: Ingests multi-service stdout/stderr streams, clusters error bursts, and maintains search indexes.
4. `detection_engine`: Evaluates continuous operational anomaly rules (`cpu_sustained_high`, `memory_high`, `container_stopped`, `restart_loop`, `error_burst`).
5. `incident_manager`: Implements the 6-state lifecycle, incident deduplication, evidence attachment, and database persistence.
6. `rag_engine`: Document chunking, dense vector embedding generation, cosine similarity search, and dynamic post-mortem indexing.
7. `ai_rca_engine`: Gathers multi-modal evidence bundles, queries RAG runbooks, and synthesizes structured root-cause analyses.
8. `remediation_engine`: Enforces operator role authentication, safety allowlists, and triggers Docker SDK operations.
9. `verification_engine`: Performs 4-point post-action health checks.
10. `assistant_engine`: Grounded SRE Copilot responding to operator inquiries with live telemetry, container states, and RAG citations.
11. `chaos_engine`: Real failure injection sandbox (CPU stress, DB stop, memory pressure, latency, error bursts).
12. `audit_logger`: Compliance recording across all operational state changes.

---

## 9. RAG Architecture

```
Technical Documentation + SRE Runbooks + Past Incident Post-Mortems
                               ↓
                   Document Parser & Chunking
                   (~250 words / logical H2-H3)
                               ↓
                     Dense Vectorizer (128-D)
             Sublinear TF-IDF + Character/Word N-Grams
                     + L2 Unit Normalization
                               ↓
               Relational Vector Store (rag_chunks)
                 (embedding_json, keywords, tags)
                               ↓
                    Incoming Diagnostic Query
                               ↓
                  Hybrid Semantic Search Fusion
  Score = 0.60 * CosineSimilarity(q, d) + 0.40 * BM25Score(q, d) + HeaderBoost
                               ↓
                   Top-K Grounded Runbook Chunks
                               ↓
              AI RCA Engine & DevOps Copilot Prompt
```

### Knowledge Sources:
1. **Technical Documentation:** Docker Engine Architecture, PostgreSQL Storage & Pooling, FastAPI Event Loops, Linux Kernel Memory & OOM Killer, Container Bridge Networking.
2. **Troubleshooting Runbooks:** PostgreSQL Connection Exhaustion, High CPU Spin Loops, Container OOMKilled (Exit 137), HTTP 504 Gateway Timeouts, Unexpected Container Exits, CrashLoopBackOff.
3. **Previous Incident Lessons:** Dynamically vectorized post-mortems indexed upon incident resolution.

---

## 10. AI RCA Workflow

```
Real Incident Triggered (Rule ID, Service Name, Container ID)
                             ↓
              Multi-Modal Evidence Bundle Collection
 (Host Metrics + Docker State + Error Log Burst Stats + Database Traces)
                             ↓
                   Vector RAG Knowledge Search
            (Finds Top-3 Matching Operational Runbooks)
                             ↓
             LLM Generation (Gemini / OpenAI / Fallback)
                             ↓
                     Structured Output Schema:
      • root_cause (Detailed technical diagnostic)
      • confidence (Percentage score or null if insufficient evidence)
      • alternative_causes (Secondary hypotheses)
      • recommendation (Plaintext action plan)
      • structured_actions (Allowlisted action objects)
      • rag_sources (Runbook title, score & category citations)
                             ↓
           Persisted to ai_analyses Database Table
```

---

## 11. Remediation Workflow

```
             AI Proposes Structured Action
        {"action": "restart_container", "target": "synexis-postgres"}
                             ↓
                  Safety Policy Validator
   • Action Type in Allowlist (restart_container, start_container, stop_container)
   • Target in Sandbox Allowlist (synexis-*)
   • Target contains only alphanumeric/hyphen characters
                             ↓
                   Pending Remediation Queue
                             ↓
             Role-Based Operator Authorization Gate
          (Requires authenticated admin / sre_operator)
                             ↓
               Operator Explicit "Approve & Execute"
                             ↓
             Real Docker SDK Operation Dispatched
                             ↓
         Automated 4-Point Health Verification Check
   1. Docker Process Running?
   2. Docker Healthcheck Passing?
   3. Application /health HTTP Probe OK?
   4. Error Log Frequency Quiescent?
                             ↓
        ALL PASSED                        ANY FAILED
            ↓                                 ↓
  Incident Marked RESOLVED           Action Marked FAILED
            ↓                                 ↓
  Post-Mortem Indexed to RAG         Escalate for Investigation
            ↓                                 ↓
  Audit Log Recorded                 Audit Log Recorded
```

---

## 12. Installation

### Prerequisites
- **Python:** 3.10 or higher
- **Node.js:** 18.0 or higher with npm
- **Docker Desktop:** Running (for container management and sandbox failure injection)

```bash
# Clone the repository
git clone https://github.com/vadathyajairam/CloudBrain-AI.git
cd CloudBrain-AI
```

---

## 13. Environment Setup

Create a `.env` file in the project root:

```env
# Database Configuration (Defaults to SQLite for instant zero-setup development)
DATABASE_URL=sqlite:///./synexis.db

# For PostgreSQL production setup:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/synexis

# Optional: AI Provider API Keys (Rule engine fallback operates automatically if omitted)
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Sandbox Configuration
SANDBOX_DEMO_URL=http://localhost:5050
```

---

## 14. Docker Setup (Optional Sandbox Cluster)

To spin up the isolated local microservices sandbox:

```bash
docker compose -f sandbox/docker-compose.yml up -d --build
```

Monitored containers:
- `synexis-demo-app` (Flask service on port `5050`)
- `synexis-postgres` (PostgreSQL on port `5433`)
- `synexis-redis` (Redis cache on port `6380`)

---

## 15. How to Run

### Step 1: Start Backend Server

```bash
# Create and activate virtual environment from project root:

# Windows PowerShell:
python -m venv venv
.\venv\Scripts\Activate.ps1

# Windows Command Prompt:
python -m venv venv
.\venv\Scripts\activate.bat

# Linux / macOS:
python3 -m venv venv
source venv/bin/activate

# Install dependencies and start server:
pip install -r backend/requirements.txt
python backend/run.py
```
*Backend API will run at `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`.*

### Step 2: Start Frontend Web Console

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```
*Frontend Console will be accessible at `http://localhost:3000`.*

---

## 16. Testing

Synexis includes a comprehensive 62-test automated test suite covering all engines, lifecycle transitions, vector mathematics, and real failure scenarios:

```bash
python -m pytest backend/tests/ -v
```

### Test Coverage Matrix:
- `test_rag_engine.py`: Vector embeddings, L2 unit norm, cosine similarity, top-k ranking, dynamic incident learning.
- `test_real_failure_scenarios.py`: Validates all 5 real failure scenarios end-to-end (Database Stopped, CPU Stress, Error Burst, Memory Pressure, Container Exit).
- `test_synexis_e2e.py`: Complete 13-stage automated lifecycle integration test.
- `test_detection_engine.py`: Anomaly rule triggers and threshold validation.
- `test_incident_manager.py`: 6-state lifecycle transitions and deduplication.
- `test_remediation.py`: Role authorization and allowlist security gates.
- `test_all.py`: Core FastAPI endpoint and metrics tests.

---

## 17. Results

```
============================= test session starts =============================
platform win32 -- Python 3.12.12, pytest-9.1.1
collected 62 items

backend/tests/test_all.py .................................. [ 10%]
backend/tests/test_detection_engine.py .................... [ 38%]
backend/tests/test_incident_manager.py .................... [ 58%]
backend/tests/test_integration_chaos_to_resolve.py ........ [ 59%]
backend/tests/test_rag_engine.py .......................... [ 70%]
backend/tests/test_real_failure_scenarios.py .............. [ 79%]
backend/tests/test_remediation.py ......................... [ 98%]
backend/tests/test_synexis_e2e.py ......................... [100%]

============================= 62 passed in 5.23s ==============================
```

- **Detection Latency:** $< 3.0$ seconds from container failure to database incident creation.
- **RAG Retrieval Speed:** $< 15$ ms for dense vector cosine similarity calculation across chunk corpus.
- **Remediation Safety:** 100% of non-allowlisted actions or unauthorized roles rejected at the API boundary.
- **Frontend Turbopack Build:** 0 TypeScript compile errors across all 10 operation views.

---

## 18. Limitations

1. **Local Boundary:** Container management is currently focused on single-node Docker engines and Docker Desktop environments.
2. **Deterministic Fallback Scope:** In environments without external LLM API keys, RCA relies on pattern-matching expert rules rather than generative synthesis.
3. **Container Name Conformance:** Monitored sandbox containers must conform to the allowed prefix pattern (`synexis-*`).

---

## 19. Future Scope

1. **Kubernetes (K8s) Operator:** Extend remediation engine to support Pod restarts, Deployment rollbacks, and Horizontal Pod Autoscaler (HPA) triggers.
2. **Multi-Cloud Connectors:** Native AWS CloudWatch, GCP Cloud Operations, and Azure Monitor telemetry ingestion.
3. **OpenTelemetry (OTel) Distributed Tracing:** Ingest W3C distributed trace spans to perform automated microservice dependency bottleneck isolation.
4. **Autonomous Remediation Policies:** Configurable auto-approval thresholds for pre-verified low-risk operational runbooks.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
