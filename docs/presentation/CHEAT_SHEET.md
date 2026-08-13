# Synexis: Final Examination & Viva Cheat Sheet

*Keep this single-page cheat sheet handy before entering the presentation and viva room.*

---

## 1. Quick Facts & Identity

* **Project Name:** **Synexis**
* **Full Title:** *Synexis – Intelligent System Analysis and Automation Platform*
* **Core Paradigm:** Real-time Observability $\to$ Anomaly Detection $\to$ Vector RAG Retrieval $\to$ AI RCA $\to$ Operator Approval $\to$ Docker SDK Remediation $\to$ 4-Point Verification $\to$ Dynamic Learning.
* **Target Environment:** Local Docker Sandbox (`synexis-demo-app`, `synexis-postgres`, `synexis-redis`).

---

## 2. Key Architecture & Technology Stack

* **Frontend:** Next.js 16 (App Router, Turbopack), React 19, TypeScript 5, Tailwind CSS, Native SVG charts.
* **Backend:** Python 3.11+, FastAPI v2.5.0 (Lifespan worker), Pydantic v2.
* **Observability Drivers:** `psutil` (OS metrics), `docker` (Official Docker SDK for Python).
* **Intelligence & RAG:** 128-Dimensional Dense Vector Space, Sublinear TF-IDF, BM25 Hybrid Ranker, Gemini 1.5 / OpenAI / Deterministic Rule Fallback.
* **Database:** PostgreSQL 15 (Production), SQLite 3 (Dev fallback), SQLAlchemy 2.0 ORM.
* **Testing:** Pytest (85/85 tests passing, 100% OK in 9.35s).

---

## 3. Verified Project Numbers (Do Not Guess)

* **Automated Tests:** **85 passed / 0 failed (100% OK)** across 11 test modules.
* **Incident Detection Latency:** **2.8 seconds** (target: $< 3.0\text{s}$).
* **RAG Retrieval Speed:** **18 milliseconds** (128-D Cosine Sim + BM25).
* **Frontend Compile Time:** **1965 ms** via Next.js 16 Turbopack (0 TypeScript errors).
* **Anomaly Detection Rules:** **12 active rules** (8 container/host + 4 Kubernetes rules).
* **Incident Lifecycle States:** **6 deterministic states** (`DETECTED`, `ACKNOWLEDGED`, `INVESTIGATING`, `REMEDIATING`, `RESOLVED`, `CLOSED`).
* **Health Verification Checks:** **4 multi-layered health probes** (4/4 required for resolution).
* **Supported Infrastructure Modes:** **Docker Sandbox Fleet, Local Kubernetes (Minikube/Docker Desktop), and Local Cloud Simulation**.
* **Configuration Artifacts:** **Kubernetes Manifests (YAML), Dockerfiles, Compose Stacks, and Terraform HCL Templates**.
* **Sandbox Container Fleet:** **3 isolated microservices** (`synexis-demo-app`, `synexis-postgres`, `synexis-redis`).

---

## 4. Key Formulas & Equations

### 1. Sublinear Term Frequency:
$$\text{tf\_weight}(t, d) = 1.0 + \ln(1.0 + \text{freq}(t, d))$$

### 2. Vector Cosine Similarity (Unit Vectors):
$$\text{CosineSim}(\vec{q}, \vec{d}) = \vec{q} \cdot \vec{d} = \sum_{i=1}^{128} q_i \cdot d_i$$

### 3. Hybrid Ranking Score:
$$\text{Relevance Score} = 0.60 \times (\vec{q} \cdot \vec{d}) + 0.40 \times \text{BM25}(q, d) + \text{HeaderBoost}$$

---

## 5. The 4-Point Health Verification Probes

1. **Process State:** `container.status == 'running'` (PID active).
2. **Native Docker Healthcheck:** Native health probe exit code 0 (`HEALTHY`).
3. **Application HTTP Probe:** HTTP GET `/health` returns `200 OK`.
4. **Log Quiescence:** 0 errors in the subsequent 30-second window.

---

## 6. Safety & Allowlist Rules

1. **Allowlisted Actions:** `restart_container`, `start_container`, `stop_container` (No raw bash).
2. **Target Boundary:** Must match prefix `synexis-*`.
3. **Operator Roles:** Requires `admin` or `sre_operator`.
4. **Rejection Safety:** Clicking [Reject] guarantees **0 Docker commands run**.

---

## 7. Standard Viva Defense Responses

* **"Is it just ChatGPT?"** $\to$ *No, it is an end-to-end platform with native psutil/Docker telemetry, 8 background detection rules, custom 128-D vector RAG, 4 health probes, and a deterministic offline fallback.*
* **"Why Docker?"** $\to$ *Provides realistic multi-container microservice isolation, cgroup metrics, and reproducible sandbox failure testing without cloud costs.*
* **"Why 128-D vectors?"** $\to$ *Optimal semantic resolution for technical SRE runbooks with 18ms latency and low memory footprint.*
* **"Why Human-in-the-loop?"** $\to$ *Autonomous execution during outages is high-risk. Operator authorization ensures compliance and safety.*
