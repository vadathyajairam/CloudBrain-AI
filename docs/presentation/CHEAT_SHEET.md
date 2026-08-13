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
* **Testing:** Pytest (62/62 tests passing, 100% OK in 5.61s).

---

## 3. Verified Project Numbers (Do Not Guess)

| Metric | Exact Number | Context |
| :--- | :---: | :--- |
| **Pytest Suite Passing** | **62 / 62 (100% OK)** | Passing in 5.61s |
| **Vector Space Dimension** | **128 Dimensions** | Unit hypersphere projection ($\|\vec{v}\|_2 = 1.0$) |
| **Telemetry Sampling Period** | **3.0 Seconds** | Lifespan background worker buffer |
| **Anomaly Detection Rules** | **8 Real Rules** | CPU, RAM, Disk, Exit, Unhealthy, RestartLoop, Logs, Probe |
| **Incident Lifecycle States** | **6 States** | `DETECTED`, `ACKNOWLEDGED`, `INVESTIGATING`, `REMEDIATING`, `RESOLVED`, `CLOSED` |
| **Pre-loaded Knowledge Runbooks** | **11 Runbooks** | Covering PostgreSQL, Docker, OOM killer, Fast concurrency, Redis |
| **Health Verification Checks** | **4 Checks** | Process State, Docker Health, App HTTP Probe, Log Quiescence |
| **Controlled Sandbox Containers** | **3 Containers** | `synexis-demo-app`, `synexis-postgres`, `synexis-redis` |
| **Failure Detection Latency** | **2.8 Seconds** | Container exit to database incident creation |
| **RAG Retrieval Search Latency** | **18 Milliseconds** | Cosine dot product + BM25 hybrid ranking |
| **Frontend Production Build** | **1092 Milliseconds** | Next.js 16 Turbopack (0 TypeScript errors) |

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
