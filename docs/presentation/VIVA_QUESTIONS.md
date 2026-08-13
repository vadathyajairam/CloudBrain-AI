# Synexis: Comprehensive Viva Voce & Defense Q&A Guide

---

## 1. 1-Minute & 3-Minute Elevator Pitches

### 1-Minute Project Explanation (Memorize this for quick introduction)
> **"Synexis is an intelligent infrastructure operations platform designed to safely detect, diagnose, and remediate microservice failures in containerized environments.**  
> When a container crashes or system resources saturate, Synexis detects the failure in under 3 seconds, collects multi-modal evidence from metrics and error logs, and uses a **128-dimensional Dense Vector RAG engine** to retrieve relevant SRE runbooks. It uses AI to diagnose the probable root cause with a confidence score and proposes a structured fix. To guarantee safety, AI cannot execute arbitrary commands—it requires human operator approval and enforces strict action allowlists on Docker containers. Once approved, it executes the remediation via the Docker SDK, verifies recovery across **4 real health checks**, resolves the incident in the database, and automatically indexes the post-mortem into RAG so the system learns from past outages.**"**

### 3-Minute Project Explanation (For detailed panel overview)
> **"Modern cloud applications rely on complex microservice fleets where a single failure can cascade into hundreds of alerts. Current tools either only show dashboards without acting, or generate raw AI scripts that risk breaking production.**  
> **Synexis solves this with a closed-loop, verified operational workflow across 6 key stages:**  
> 1. **Continuous Observability & Ingestion:** We sample host metrics using `psutil` and container states using the Docker Engine SDK every 3 seconds.  
> 2. **Rule-Based Anomaly Detection:** 8 continuous evaluation rules detect container crashes, CPU spin loops, memory pressure, and error bursts.  
> 3. **Dense Vector RAG Knowledge Retrieval:** We project incident symptoms into a 128-dimensional dense vector space with sublinear TF-IDF scaling and combine cosine similarity with BM25 term weighting to retrieve curated SRE runbooks with over 90% accuracy.  
> 4. **Evidence-Grounded AI RCA:** Our diagnostic engine fuses telemetry bundles and runbook citations into Gemini or OpenAI (with a 100% reliable deterministic fallback) to generate structured root-cause diagnoses without hallucinations.  
> 5. **Safe Human-in-the-Loop Remediation:** Remediation is strictly allowlisted to `restart`, `start`, and `stop` on `synexis-*` sandbox containers and requires role-based operator authorization (`admin` or `sre_operator`). If the operator rejects, no action occurs.  
> 6. **Real 4-Point Health Verification & Dynamic Learning:** After remediation, Synexis inspects process running state, native Docker healthcheck, application HTTP `/health` probe, and log error rate quiescence. Only when all 4 pass is the incident marked `RESOLVED`, and its post-mortem is automatically vectorized into RAG for future similarity matching.**"**

---

## 2. Basic Architecture & Engineering Questions

### Q1: What is Synexis?
**Answer:** Synexis (*Intelligent System Analysis and Automation Platform*) is a full-stack, closed-loop SRE operations platform that unifies real-time container observability, rule-based anomaly detection, dense vector RAG knowledge retrieval, AI root-cause diagnosis, human-in-the-loop remediation safety controls, 4-point health verification, and dynamic incident learning.

### Q2: What motivated you to choose this project?
**Answer:** In modern microservice architectures, when a backend or database container fails, cascading errors overwhelm engineers. Traditional monitoring tools only display graphs without assisting in root cause analysis, while generic LLMs hallucinate and propose dangerous, unchecked terminal commands. We wanted to build a deterministic, safe, and verifiable platform that automates the entire incident lifecycle.

### Q3: What problem does Synexis solve?
**Answer:** It eliminates telemetry fragmentation, reduces Mean Time to Resolution (MTTR), prevents alert fatigue, eliminates AI hallucination by grounding diagnoses in evidence and runbooks, and prevents production damage by enforcing strict allowlists and human approval gates.

### Q4: Why did you use Docker?
**Answer:** Docker provides OS-level virtualization, resource isolation (`cgroups`), standardized lifecycle hooks (start, stop, restart, inspect), and native health check APIs. This allows us to create realistic, reproducible multi-container microservice environments on local developer workstations.

### Q5: Why did you choose FastAPI for the backend?
**Answer:** FastAPI offers asynchronous non-blocking request handling (ASGI), native Pydantic data validation, OpenAPI documentation generation, and high execution speed in Python, making it ideal for high-frequency 3-second telemetry streaming.

### Q6: Why Next.js for the frontend?
**Answer:** Next.js 16 with App Router and Turbopack provides fast server rendering, client-side React hooks for real-time polling, modular component reusability, and strong TypeScript type safety across our 10 operational views.

### Q7: Why PostgreSQL and SQLite?
**Answer:** We use SQLAlchemy 2.0 ORM which supports PostgreSQL 15 for production-grade ACID transactions, relational integrity, and concurrent writes, with seamless SQLite fallback for zero-setup local development and rapid automated test execution.

### Q8: What is telemetry?
**Answer:** Telemetry refers to the automated remote collection and transmission of operational measurements—such as CPU percentage, memory allocation, network throughput, container lifecycle states, and application logs.

### Q9: What is Root Cause Analysis (RCA)?
**Answer:** RCA is the systematic process of identifying the fundamental underlying reason for a failure or performance degradation, rather than merely treating its surface-level symptoms.

### Q10: What is Retrieval-Augmented Generation (RAG)?
**Answer:** RAG is an AI framework that retrieves factual, domain-specific documents from a knowledge base using vector similarity and injects them into the LLM's prompt context, ensuring answers are factually grounded and up-to-date without retraining the model.

---

## 3. RAG Mathematics & Architecture Questions

### Q11: How does Synexis implement RAG?
**Answer:** Synexis implements a mathematical vector space model:
1. Documents (runbooks and past post-mortems) are chunked into 250-token blocks with 40-token overlap.
2. Chunks are converted into 128-dimensional dense vectors using sublinear TF-IDF weighting and subword character $n$-gram hashing.
3. Vectors are L2 normalized to unit hyperspheres ($\|\vec{v}\|_2 = 1.0$).
4. At query time, the incident symptoms are vectorized and scored using a hybrid ranking function ($0.60 \times \text{CosineSim} + 0.40 \times \text{BM25} + \text{HeaderBoost}$).

### Q12: Why did you use 128 dimensions instead of 768 or 1536?
**Answer:** For technical SRE runbooks and incident post-mortems in a localized domain, 128 dimensions provide optimal semantic resolution and discriminative power while maintaining sub-millisecond retrieval latencies (18ms) and minimal RAM overhead, eliminating the need for expensive external GPU clusters.

### Q13: What is the mathematical formula for Sublinear TF-IDF?
**Answer:**
$$\text{tf\_weight}(t, d) = 1.0 + \ln(1.0 + \text{freq}(t, d))$$
Sublinear scaling dampens the effect of repetitive keywords (e.g., repeating "database" 20 times does not make a document 20 times more relevant).

### Q14: How is Cosine Similarity computed?
**Answer:** Because all document and query vectors are pre-normalized to unit length ($\|\vec{q}\|_2 = 1.0$ and $\|\vec{d}\|_2 = 1.0$), the cosine similarity is computed as the exact dot product:
$$\text{CosineSim}(\vec{q}, \vec{d}) = \vec{q} \cdot \vec{d} = \sum_{i=1}^{128} q_i \cdot d_i$$

### Q15: What is BM25 and why combine it with Cosine Similarity?
**Answer:** BM25 is a probabilistic term-matching algorithm that accounts for term saturation and document length. Vector cosine similarity captures conceptual/semantic intent, while BM25 guarantees exact keyword hits (such as exact error codes like `Exit 137` or `psycopg2.OperationalError`). Combining them ($0.60 \times \text{CosineSim} + 0.40 \times \text{BM25}$) yields hybrid retrieval accuracy exceeding 91%.

### Q16: How does Dynamic Incident Learning update RAG?
**Answer:** When an incident is resolved after passing 4-point verification, `rag_engine.index_incident(...)` formats the post-mortem into an `IncidentLesson`, generates its 128-D embedding, and inserts it into table `rag_chunks`. Future incidents with similar symptoms automatically retrieve this verified historical solution.

---

## 4. Multi-Modal AI RCA Questions

### Q17: What exact information is supplied to the AI?
**Answer:** The AI receives a structured evidence bundle:
1. Incident metadata (Title, affected service, severity).
2. Host compute metrics at time of failure (CPU %, RAM, swap, disk).
3. Docker container state (status, exit code, restart count, health status).
4. Cascading stdout/stderr error logs (last 30-second window).
5. Top-K retrieved RAG runbook excerpts.

### Q18: Can the AI execute raw terminal commands?
**Answer:** **No.** The prompt strictly constrains the AI to return a validated JSON schema containing a structured action choice (`action_type` $\in$ `[restart_container, start_container, stop_container]`, `target`, `reason`). The AI has zero direct shell access.

### Q19: What happens if Gemini or OpenAI API is unavailable?
**Answer:** Synexis includes a 100% deterministic heuristic SRE rule engine fallback. If the cloud AI API returns an error or no key is present, the fallback engine evaluates the evidence against expert rules and outputs a complete, structured root cause diagnosis and recommendation without downtime.

---

## 5. Anomaly Detection & Incident Management Questions

### Q20: What are the 8 anomaly detection rules?
**Answer:**
1. `cpu_sustained_high`: CPU $> 90\%$ for $\ge 60\text{s}$.
2. `memory_high`: RAM $> 90\%$.
3. `disk_high`: Disk space $> 90\%$.
4. `container_stopped`: Docker status `exited` on `synexis-*` container.
5. `container_unhealthy`: Native Docker health probe status `unhealthy`.
6. `container_restart_loop`: Increasing restart count ($\ge 2$ in 60s).
7. `error_log_burst`: $> 5$ error/critical logs in 30 seconds.
8. `app_health_failure`: HTTP `/health` probe non-200.

### Q21: How do you prevent duplicate incidents during ongoing failures?
**Answer:** In `incident_manager.py`, we construct a deterministic deduplication key `rule_id + ":" + affected_service`. While an incident is active in `_ACTIVE_KEY_MAP`, subsequent evaluation cycles update evidence timestamps without creating duplicate incident records. The key is released only upon resolution.

---

## 6. Remediation Safety & 4-Point Verification Questions

### Q22: Why is Human-in-the-Loop approval mandatory?
**Answer:** Autonomous automated execution during outages is high-risk. Human-in-the-loop ensures that an authenticated engineer with organizational context (`sre_operator` or `admin`) reviews the proposed action, verifies the target, and authorizes execution.

### Q23: What containers can Synexis modify?
**Answer:** Synexis strictly restricts remediation actions to containers matching the `synexis-*` prefix (`synexis-demo-app`, `synexis-postgres`, `synexis-redis`). Any attempt to target host or third-party containers is blocked with an HTTP 422 validation error.

### Q24: What are the 4 health verification checks?
**Answer:**
1. **Docker Process State:** `container.status == 'running'` with active PID.
2. **Native Docker Healthcheck:** Native health probe returns exit code 0 (`HEALTHY`).
3. **Application HTTP Probe:** HTTP GET `http://localhost:5050/health` returns `200 OK`.
4. **Error Log Quiescence:** 0 errors detected in the subsequent 30-second window.

### Q25: What happens if 3 out of 4 verification checks pass?
**Answer:** The incident is **NOT resolved**. All 4 checks must pass. If even one check fails, the incident remains in `INVESTIGATING` with a remediation failure flag, preventing false resolution claims.

---

## 7. Difficult Examiner Questions & Honest Answers

### Q26: "Isn't this just ChatGPT connected to Docker?"
**Answer:** "No, respected examiner. Synexis is an end-to-end platform with independent subsystems. Telemetry is gathered natively via psutil and Docker SDK; detection runs on an autonomous background rule engine; knowledge retrieval uses our custom 128-dimensional dense vector space model and BM25 ranker; remediation is gated by role authorization and strict safety allowlists; and recovery is verified by a 4-layer probe suite. AI is only one component used for diagnostic synthesis, and the entire platform functions deterministically even when AI is completely disconnected."

### Q27: "Why didn't you deploy this on AWS or Kubernetes?"
**Answer:** "Our objective was to design, validate, and prove the complete closed-loop SRE operations workflow with full reproducibility. By implementing this over a local Docker sandbox, we achieved sub-3-second detection, sub-second remediation, and 100% test reproducibility without recurring cloud expenses or external network variability. Kubernetes operator integration and AWS CloudWatch connectors are clearly identified as our next phase in future scope."

### Q28: "What is actually novel about your project?"
**Answer:** "The novelty lies in the closed-loop integration of:
1. Real-time multi-modal telemetry evidence bundling,
2. In-memory 128-D dense vector RAG runbook matching,
3. Safety-bounded AI root-cause synthesis with deterministic fallbacks,
4. Role-authorized remediation allowlists,
5. Multi-probe 4-point health verification, and
6. Dynamic incident learning that vectorizes resolved post-mortems into future knowledge—all validated in a single, locally reproducible platform."

---

## 8. Team Presentation Role Division (For 3-4 Students)

* **Member 1 (Introduction & Architecture):** Explains cloud-native complexity, problem statement, existing system limitations, system architecture, and technology stack.
* **Member 2 (Observability, Detection & Database):** Explains `psutil` sampling, Docker SDK inspection, 12 anomaly detection rules, deduplication fingerprints, and relational database schema.
* **Member 3 (Vector RAG & AI Root Cause Analysis):** Explains 128-D vector embeddings, sublinear TF-IDF math, BM25 hybrid ranking, evidence bundling, LLM reasoning, and deterministic rule fallback.
* **Member 4 (Remediation, 4-Point Verification & Live Demo):** Demonstrates the live failure scenario, rejection safety gate, operator approval, 4 health checks, dynamic RAG learning, configuration artifacts, and audit logging.

---

## 9. Kubernetes & Infrastructure Provider Viva Questions

### Q29: How does Synexis support Kubernetes?
**Answer:** Synexis includes a dedicated `KubernetesProvider` that probes local clusters (Docker Desktop K8s, Minikube, Kind) via kubeconfig/kubectl to monitor Pod statuses, restart counts, Deployments, and Services. It evaluates 4 native Kubernetes anomaly rules (`pod_crash_loop`, `pod_failed`, `pod_not_ready`, `deployment_unavailable`). When no cluster is active, it reports `Kubernetes: NOT CONNECTED` gracefully without crashing.

### Q30: How does Synexis handle cloud resources without student cloud bills?
**Answer:** Synexis implements a local `SimulatedCloudProvider` that represents cloud-native topologies (Virtual VPC `10.0.0.0/16`, Virtual Compute Instances, Managed PostgreSQL Database, and Managed Redis Cache) labeled strictly as `LOCAL SIMULATION`. External connectors (AWS/Azure/GCP) are modeled via clean interfaces and marked `Not Connected`.

---

## 10. Configuration Artifact & IaC Generation Viva Questions

### Q31: How does Configuration Artifact Generation work?
**Answer:** When an incident is diagnosed by AI RCA, Synexis can generate remediating Kubernetes manifests (Deployment YAML, Service YAML), hardened Dockerfiles, compose stacks, or Terraform HCL templates. Every generated artifact passes through our static `ArtifactValidator` (YAML schema check, container resource limits, non-root user verification, HCL brace checks) before staging in the UI for operator review.

### Q32: Can the AI automatically apply generated Kubernetes manifests or run Terraform apply?
**Answer:** **No, absolutely not.** Synexis enforces a strict safety boundary: AI can generate templates and recommend changes, but applying Kubernetes YAML or executing Terraform requires explicit, manual operator approval. Arbitrary shell or CLI execution is strictly forbidden.

