# Synexis Platform — Technical Architecture & Workflow Diagrams

This directory contains the official technical diagrams for **Synexis** (*Intelligent System Analysis and Automation Platform*).

All diagrams are provided in two formats:
1. **High-Resolution Vector SVG**: Stored directly in `docs/diagrams/*.svg` for presentations, reports, and publication.
2. **Standard Mermaid Markdown**: Native text definitions below for GitHub rendering and documentation.

---

## 1. System Architecture Diagram

Vector File: [`docs/diagrams/system-architecture.svg`](./system-architecture.svg)

```mermaid
graph TD
    UI["Web Console<br/>(Next.js 16 / React 19 / Turbopack)"] -->|HTTP REST API /api/v1/*| API["FastAPI Backend Gateway<br/>(Lifespan Worker & Routers)"]
    
    API --> TEL["Telemetry Pipeline<br/>(psutil Host Metrics)"]
    API --> DET["Detection Engine<br/>(8 Continuous Rules)"]
    API --> DOCK["Container Engine<br/>(Docker SDK / synexis-* fleet)"]
    
    TEL --> INC["Incident Manager<br/>(6-State Persistent State Machine)"]
    DET --> INC
    DOCK --> INC
    
    INC <--> DB[("Application Database<br/>PostgreSQL / SQLite")]
    INC --> EVID["Multi-Modal Evidence Bundle<br/>(Metrics, Container State, Logs, DB Traces)"]
    
    EVID --> RAG["Vector RAG Engine<br/>(128-D Embeddings, BM25 Hybrid)"]
    EVID --> RCA["AI RCA Engine<br/>(Gemini / OpenAI + Rule Fallback)"]
    RAG -->|Runbook Citations| RCA
    
    RCA --> ACT["Structured Action Proposal<br/>(action, target, reason)"]
    ACT --> SAFE["Safety Validation<br/>(Allowed Actions & synexis-* Boundary)"]
    SAFE --> GATE["Operator Approval Gate<br/>(Role Authorization: admin / sre_operator)"]
    GATE -->|Approve & Execute| REM["Remediation Engine<br/>(Docker SDK Dispatch)"]
    
    REM --> VERIF["Real 4-Point Health Verification<br/>(Process, Health, Probe, Logs)"]
    VERIF -->|All Checks Pass| RES["Incident RESOLVED<br/>(Recorded in audit_logs)"]
    RES -->|Dynamic Learning| RAG
```

---

## 2. Docker Sandbox Cluster Diagram

Vector File: [`docs/diagrams/docker-sandbox.svg`](./docker-sandbox.svg)

```mermaid
graph TD
    subgraph DockerNetwork ["Docker Isolated Network (synexis-sandbox-net / 172.20.0.0/16)"]
        DEMO["synexis-demo-app<br/>(Python 3.11 / Flask)<br/>Port 5050:5000"]
        PG["synexis-postgres<br/>(PostgreSQL 15-alpine)<br/>Port 5433:5432"]
        REDIS["synexis-redis<br/>(Redis 7-alpine)<br/>Port 6380:6379"]
        
        DEMO -->|psycopg2 Pool| PG
        DEMO -->|redis-py Socket| REDIS
    end

    PLATFORM["Synexis Platform Gateway<br/>(Docker SDK & psutil Host Telemetry)"]
    PLATFORM -.->|Inspect & Control| DEMO
    PLATFORM -.->|Inspect & Control| PG
    PLATFORM -.->|Inspect & Control| REDIS
```

---

## 3. Complete 14-Stage Operational Workflow

Vector File: [`docs/diagrams/workflow.svg`](./workflow.svg)

```mermaid
flowchart TD
    S01["1. Infrastructure Event (Stop, Spike, Error Burst)"] --> S02["2. Telemetry Collection (psutil + Docker SDK)"]
    S02 --> S03["3. Anomaly Detection (8 Evaluation Rules)"]
    S03 --> S04["4. Incident Creation (State: DETECTED)"]
    S04 --> S05["5. Evidence Collection (Metrics, State, Logs, Probes)"]
    S05 --> S06["6. Vector RAG Retrieval (128-D Cosine + BM25)"]
    S06 --> S07["7. AI Root Cause Analysis (Grounded LLM + Heuristics)"]
    S07 --> S08["8. Structured Action Recommendation"]
    S08 --> S09["9. Safety Validation (Allowlist & Container Boundary)"]
    S09 --> S10["10. Human Operator Approval Gate (Role: sre_operator)"]
    S10 --> S11["11. Remediation Execution (Docker SDK Method)"]
    S11 --> S12["12. Recovery Verification (4 Health Checks)"]
    S12 --> S13["13. Incident Resolution (State: RESOLVED & Audited)"]
    S13 --> S14["14. Dynamic Knowledge Indexing (IncidentLesson Vectorized)"]
```

---

## 4. Incident Lifecycle State Machine

Vector File: [`docs/diagrams/incident-lifecycle.svg`](./incident-lifecycle.svg)

```mermaid
stateDiagram-v2
    [*] --> DETECTED: Anomaly Rule Triggered
    DETECTED --> ACKNOWLEDGED: Operator Triage
    ACKNOWLEDGED --> INVESTIGATING: Evidence Gathered & RAG Match
    INVESTIGATING --> REMEDIATING: Operator Approves Fix
    REMEDIATING --> RESOLVED: 4-Point Health Checks Pass
    INVESTIGATING --> RESOLVED: Auto-Resolved (Quiescent)
    RESOLVED --> CLOSED: Post-Mortem Archived & Vectorized
    CLOSED --> [*]
```

---

## 5. Vector RAG Architecture

Vector File: [`docs/diagrams/rag-architecture.svg`](./rag-architecture.svg)

```mermaid
graph TD
    RUNBOOKS["11 SRE Runbooks & Technical Guides"] --> CHUNK["Recursive Chunking<br/>(250 Tokens / 40 Overlap)"]
    POSTMORTEM["Resolved Incident Lessons"] --> CHUNK
    
    CHUNK --> VEC["128-D Dense Vector Embeddings<br/>(Sublinear TF-IDF + Subword Hashing + L2 Unit Norm)"]
    VEC --> STORE[("Local Vector Store<br/>rag_chunks Table")]
    
    QUERY["Incident Symptoms & Error Query"] --> Q_VEC["Query Vectorizer"]
    Q_VEC --> HYBRID["Hybrid Ranker Engine<br/>(0.60 × CosineSim + 0.40 × BM25 + HeaderBoost)"]
    STORE --> HYBRID
    
    HYBRID --> TOPK["Top-K Grounded Citations"]
    TOPK --> RCA["AI RCA Engine"]
    TOPK --> COPILOT["DevOps Copilot"]
```

---

## 6. Multi-Modal AI RCA Flow

Vector File: [`docs/diagrams/ai-rca.svg`](./ai-rca.svg)

```mermaid
graph LR
    subgraph Inputs ["Multi-Modal Evidence"]
        E1["Host Compute Metrics"]
        E2["Docker Container State"]
        E3["Error Log Traces"]
        E4["RAG Runbook Citations"]
    end
    
    Inputs --> AI["AI Diagnostic Engine<br/>(Gemini / OpenAI + Rule Fallback)"]
    
    subgraph Output ["Structured JSON Schema"]
        O1["root_cause: str"]
        O2["confidence: int (0-100)"]
        O3["evidence: list[str]"]
        O4["recommendation: str"]
        O5["structured_actions: list[Action]"]
        O6["rag_sources: list[Citation]"]
    end
    
    AI --> Output
```

---

## 7. Safe Human-in-the-Loop Remediation

Vector File: [`docs/diagrams/remediation.svg`](./remediation.svg)

```mermaid
flowchart TD
    PROP["Structured Action Proposal"] --> VAL["Safety Validator Engine"]
    VAL -->|Action ∈ ALLOWED_ACTIONS & Target ∈ synexis-*| GATE{"Operator Approval Gate<br/>(Role: admin / sre_operator)"}
    
    GATE -->|REJECT| REJ["Action REJECTED<br/>(No Docker command executes)"]
    GATE -->|APPROVE| APP["Action APPROVED<br/>(Operator identity recorded)"]
    
    APP --> DOCK["Docker SDK Dispatch<br/>(container.restart / start / stop)"]
    DOCK --> VERIF["4-Point Health Verification"]
    
    REJ --> AUDIT[("Compliance Audit Log<br/>audit_logs Table")]
    VERIF --> AUDIT
```

---

## 8. Real 4-Point Health Verification

Vector File: [`docs/diagrams/verification.svg`](./verification.svg)

```mermaid
flowchart TD
    EXEC["Docker Remediation Action Executed"] --> CHKS["4-Point Health Verification Suite"]
    
    subgraph Checks ["Verification Probes"]
        C1["1. Docker Process State == 'running'"]
        C2["2. Native Healthcheck == 'healthy'"]
        C3["3. HTTP Probe /health == 200 OK"]
        C4["4. Log Error Rate < Threshold"]
    end
    
    CHKS --> Checks
    Checks --> EVAL{"All 4 Probes Passed?"}
    
    EVAL -->|YES| PASS["Incident RESOLVED<br/>Post-Mortem Vectorized into RAG"]
    EVAL -->|NO| FAIL["Remain in INVESTIGATING<br/>Escalate Alert to Operators"]
```

---

## 9. End-to-End Data Flow

Vector File: [`docs/diagrams/data-flow.svg`](./data-flow.svg)

```mermaid
sequenceDiagram
    participant Host as Docker & Host Cluster
    participant Pipeline as Telemetry Pipeline
    participant Detection as Detection Engine
    participant DB as PostgreSQL / SQLite
    participant RAG as Vector RAG Engine
    participant AI as AI RCA Engine
    participant Operator as SRE Operator
    participant SDK as Docker SDK Engine
    
    Host->>Pipeline: Raw Metrics & Log Stream (3s)
    Pipeline->>Detection: Standardized Telemetry Frame
    Detection->>DB: Persist Incident (DETECTED)
    DB->>RAG: Embed Incident Context
    RAG->>AI: Return Top-K Runbook Citations
    AI->>DB: Persist Structured RCA & Proposed Action
    Operator->>DB: Approve Action (Role Authorization)
    DB->>SDK: Dispatch Allowed Lifecycle Action
    SDK->>Host: Execute Docker Command on synexis-*
    Host->>Pipeline: Emit Recovered Health & Quiescent Logs
    Pipeline->>DB: 4-Point Check Passed → Mark RESOLVED
    DB->>RAG: Index Resolved Lesson into rag_chunks
```

---

## 10. Technology Stack Diagram

Vector File: [`docs/diagrams/technology-stack.svg`](./technology-stack.svg)

```mermaid
graph TD
    subgraph Frontend ["Presentation Layer"]
        NXT["Next.js 16 (Turbopack)"]
        RCT["React 19 & TypeScript 5"]
        CSS["Tailwind & SRE CSS Tokens"]
        SVG["Native SVG Resource Charts"]
    end

    subgraph Backend ["Application Gateway Layer"]
        PY["Python 3.11+"]
        FST["FastAPI v2.5.0 (Async Routers)"]
        LIFE["Lifespan Background Worker"]
        PYD["Pydantic v2 Schema Validation"]
    end

    subgraph Observability ["Telemetry & Control"]
        PS["psutil (Host Compute Probes)"]
        SDK["Docker Python SDK"]
        RULES["8 Continuous Detection Rules"]
    end

    subgraph Intelligence ["Intelligence & Vector RAG"]
        VEC["128-D Dense Embeddings (Sublinear TF-IDF)"]
        HYB["BM25 + Cosine Hybrid Ranking"]
        LLM["Grounded AI RCA (Gemini / OpenAI)"]
        FALL["Deterministic SRE Rule Fallback"]
    end

    subgraph Storage ["Persistence & Compliance"]
        SQL["SQLAlchemy 2.0 ORM"]
        PG["PostgreSQL 15 (Production)"]
        SQLITE["SQLite 3 (Development Fallback)"]
    end

    Frontend --> Backend
    Backend --> Observability
    Backend --> Intelligence
    Backend --> Storage
```

---

## 11. Multi-Provider Infrastructure Architecture

```mermaid
graph TD
    subgraph SynexisCore ["Synexis Core Telemetry Pipeline"]
        IP["InfrastructureProvider (Abstract Base)"]
    end

    subgraph ConcreteProviders ["Concrete Providers"]
        DP["DockerProvider\n(psutil + Docker SDK)"]
        KP["KubernetesProvider\n(Local K8s / Minikube)"]
        SP["SimulatedCloudProvider\n(Virtual VPC, DB, Cache)"]
        CP["ExternalCloudStubProvider\n(AWS / Azure / GCP)"]
    end

    subgraph Targets ["Execution Targets"]
        T_DOCKER["synexis-* Docker Sandbox Fleet"]
        T_K8S["Local Kubernetes Pods & Deployments"]
        T_SIM["Academic Cloud Topology Simulation"]
        T_CLOUD["Unconnected Cloud Stubs"]
    end

    IP --> DP
    IP --> KP
    IP --> SP
    IP --> CP

    DP --> T_DOCKER
    KP --> T_K8S
    SP --> T_SIM
    CP -.-> T_CLOUD
```

---

## 12. Configuration Artifact Generation & Operator Review Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Operator as SRE Operator
    participant RCA as AI RCA Engine
    participant RAG as Dense Vector RAG
    participant Gen as Artifact Generator
    participant Val as Artifact Validator
    participant DB as Audit & Artifact Store

    RCA->>RAG: Retrieve remediating runbook context
    RAG-->>RCA: Runbook snippets + recommended manifest config
    RCA->>Gen: Request artifact generation (K8s / Docker / Terraform)
    Gen->>Val: Pass raw artifact content for static validation
    Val-->>Gen: Return ValidationReport (VALID / WARNING / INVALID)
    Gen->>DB: Store artifact as PENDING_REVIEW
    DB-->>Operator: Display in Configuration Artifacts UI
    
    alt Operator Approves Artifact
        Operator->>DB: Approve Artifact (Role: admin / sre_operator)
        DB-->>Operator: Marked APPROVED (Ready for manual deploy)
    else Operator Rejects Artifact
        Operator->>DB: Reject Artifact
        DB-->>Operator: Marked REJECTED
    end
```

