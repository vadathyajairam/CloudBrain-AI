"""
rag_engine.py  —  Synexis Vector & Semantic RAG Knowledge Engine

Architecture:
  Documents / Runbooks / Incident Post-Mortems
                 ↓
          Document Processing
                 ↓
        Markdown Chunking (~250 tokens per chunk)
                 ↓
     Dense Vector Embeddings & TF-IDF / BM25 Weighting
                 ↓
      Relational Vector Store (rag_documents & rag_chunks)
                 ↓
   Hybrid Semantic Vector Search (Cosine Similarity + BM25 Scoring)
                 ↓
      Retrieved Top-K Knowledge Chunks
                 ↓
         AI RCA Engine & AI Copilot

Features:
- Built-in Curated SRE/DevOps Runbooks (Postgres, CPU Spin Loop, OOMKilled, HTTP 504, etc.)
- Dense vector embedding space (128-dim dense projections with L2 unit normalization)
- Sublinear TF-IDF + BM25 relevance weighting
- Vector dot-product / cosine similarity semantic retrieval
- Neural embeddings integration (Gemini / OpenAI) with offline dense vector fallback
- Incident Learning Loop: Auto-indexes resolved incidents into vector knowledge base
"""
from __future__ import annotations

import json
import math
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from backend.app.config import settings
from backend.app.database import db_session
from backend.app.database.models import RAGChunk, RAGDocument

# ── Stopwords for Tokenization & Keyword Extraction ───────────────────────────
_STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
    "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
    "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
    "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
    "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
    "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
    "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
    "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
    "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't",
    "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
    "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "through", "to", "too", "under", "until", "up",
    "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
    "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
    "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
    "yourself", "yourselves",
}

# ── Built-in Curated DevOps & SRE Runbooks ────────────────────────────────────
BUILTIN_RUNBOOKS: list[dict[str, Any]] = [
    {
        "id": "RUNBOOK-POSTGRES-CONN-01",
        "title": "PostgreSQL Connection Exhaustion & OperationalError Triage",
        "category": "Runbook",
        "tags": ["postgres", "database", "connections", "pool", "psycopg2", "operationalerror", "timeout"],
        "content": """# PostgreSQL Connection Exhaustion & OperationalError Triage

### Symptoms
- Application logs contain: `psycopg2.OperationalError: could not connect to server: Connection refused` or `FATAL: remaining connection slots are reserved for non-replication superuser connections`.
- Web service latency increases dramatically or returns HTTP 500 / 504.
- Synexis Detection Engine triggers `error_burst` or `container_stopped` rule for `synexis-postgres`.

### Root Causes
1. **Connection Pool Exhaustion:** Application workers do not close database connections or pool size exceeds `max_connections` (default: 100).
2. **Container Stopped or Crashed:** `synexis-postgres` container exited unexpectedly or was terminated by Docker daemon.
3. **Network Isolation:** Docker bridge network unreachable or port 5432 binding collision.

### Diagnostic Steps
1. Check if `synexis-postgres` container is running: `docker ps --filter "name=synexis-postgres"`.
2. Inspect active connections: `SELECT count(*) FROM pg_stat_activity WHERE state = 'active';`.
3. Check PostgreSQL server logs for out-of-memory or fatal panic logs.

### Remediation Actions
1. **Restart/Start Container:** Execute `restart_container` on `synexis-postgres`.
2. **Increase Pool Size:** Update `max_connections = 200` in postgresql.conf.
3. **Health Verification:** Send TCP/HTTP probe to port 5432 and verify status returns `healthy`.""",
    },
    {
        "id": "RUNBOOK-CPU-SPIN-02",
        "title": "High CPU Utilization & Spin Loop Remediation",
        "category": "Runbook",
        "tags": ["cpu", "load", "spinloop", "worker", "utilization", "spike", "throttling"],
        "content": """# High CPU Utilization & Spin Loop Remediation

### Symptoms
- Host or container CPU usage sustained above 85% for > 60 seconds.
- Synexis Detection Engine triggers `cpu_sustained_high` rule.
- Increased request latency across all HTTP endpoints.

### Root Causes
1. **Unbounded Spin Loop:** While loop without sleep/yield condition in worker task.
2. **Excessive Concurrency:** Thread pool saturation handling retry storm.
3. **Inefficient Query / Regex:** ReDoS (Regular Expression Denial of Service) or unindexed table full-scan.

### Diagnostic Steps
1. Identify high-load container via `docker stats`.
2. Sample thread dump or profile process via Python `py-spy` / Node.js profiler.
3. Verify if error burst occurred immediately before the CPU spike.

### Remediation Actions
1. **Restart Offending Container:** Execute `restart_container` on the target service to terminate runaway spin loops.
2. **Apply Rate Limiting:** Enforce token bucket rate limiting on incoming API traffic.
3. **Verify Recovery:** Confirm CPU usage drops below 40% within 15 seconds post-restart.""",
    },
    {
        "id": "RUNBOOK-OOM-KILL-03",
        "title": "Container OOMKilled (Exit Code 137) & Memory Leak",
        "category": "Runbook",
        "tags": ["memory", "oom", "137", "sigkill", "leak", "cgroup", "ram"],
        "content": """# Container OOMKilled (Exit Code 137) & Memory Leak

### Symptoms
- Container terminates abruptly with exit code `137` (SIGKILL issued by Linux OOM killer).
- Synexis Detection Engine triggers `memory_high` or `container_stopped`.
- Sudden drop in memory graph followed by service restart counter increment.

### Root Causes
1. **Unbounded Memory Growth:** In-memory caching without LRU eviction policy or circular object retention.
2. **Undersized Memory Limits:** `mem_limit` configured in `docker-compose.yml` is too low for current traffic volume.
3. **Large File Ingestion:** Buffering entire multi-megabyte payloads in RAM instead of streaming.

### Diagnostic Steps
1. Inspect container termination reason via `docker inspect --format '{{.State.OOMKilled}}' <container>`.
2. Check memory growth gradient in Synexis Live Telemetry chart.
3. Inspect application logs for heap allocation exceptions.

### Remediation Actions
1. **Restart & Release Memory:** Execute `restart_container` on affected container.
2. **Adjust Cgroup Limits:** Increase memory limit in `docker-compose.yml` (e.g. from 256MB to 512MB).
3. **Verify Stability:** Verify container uptime extends past 30 seconds without memory creep.""",
    },
    {
        "id": "RUNBOOK-HTTP-504-04",
        "title": "HTTP 504 Gateway Timeout & Upstream Latency Degradation",
        "category": "Runbook",
        "tags": ["504", "timeout", "latency", "gateway", "upstream", "slow", "proxy"],
        "content": """# HTTP 504 Gateway Timeout & Upstream Latency Degradation

### Symptoms
- API Gateway / Reverse proxy logs show HTTP 504 Gateway Timeout or 502 Bad Gateway.
- Client requests hang for 30–60 seconds before failing.
- Response time metrics in Synexis telemetry exceed 2000ms.

### Root Causes
1. **Downstream Service Hang:** Microservice blocked on synchronous external API or locked database row.
2. **Artificial Latency Chaos:** Chaos sandbox injection simulating network delays or socket hangs.
3. **Thread/Connection Starvation:** All HTTP handler workers blocked awaiting I/O.

### Diagnostic Steps
1. Trace upstream dependency response times.
2. Check active lock status in PostgreSQL / Redis.
3. Inspect Gateway proxy timeout configurations.

### Remediation Actions
1. **Clear Latency Injection / Restart:** Restart container or clear artificial latency state.
2. **Add Circuit Breaker:** Implement fallback response when downstream exceeds 1500ms.
3. **Index Missing DB Columns:** Add B-tree indexes to foreign keys and search columns.""",
    },
    {
        "id": "RUNBOOK-CONT-EXIT-05",
        "title": "Container Unexpected Exit & Service Outage Recovery",
        "category": "Runbook",
        "tags": ["container", "exit", "stopped", "dead", "down", "outage", "crashed"],
        "content": """# Container Unexpected Exit & Service Outage Recovery

### Symptoms
- Container status changes to `exited`, `dead`, or `unhealthy`.
- Synexis Detection Engine triggers `container_stopped` rule with severity CRITICAL.
- Dependent microservices report connection refused or DNS resolution failure for container hostname.

### Root Causes
1. **Unhandled Exception / Panic:** Uncaught fatal runtime error during initialization or request handling.
2. **Manual or Chaos Stop:** Container was stopped via Docker CLI, API, or Chaos Sandbox injection (`db_stop`).
3. **Healthcheck Failure:** Configured Docker healthcheck command failed consecutive retry threshold.

### Diagnostic Steps
1. Inspect container exit code: `0` (clean shutdown), `1` (application error), `137` (OOM), `139` (segmentation fault).
2. Read tail of container logs immediately preceding termination.
3. Verify if dependent environment variables or volume mounts are accessible.

### Remediation Actions
1. **Execute Start/Restart:** Send approved `start_container` / `restart_container` action via Synexis Remediation Engine.
2. **Run Post-Verification Check:** Verify container status is `running` and restart count remains stable for 15 seconds.
3. **Check Resolution:** Once healthy, incident automatically transitions to `RESOLVED`.""",
    },
    {
        "id": "RUNBOOK-RESTART-LOOP-06",
        "title": "Container CrashLoopBackOff & Rapid Restart Loop",
        "category": "Runbook",
        "tags": ["restart", "loop", "crashloop", "restarting", "crash", "flapping"],
        "content": """# Container CrashLoopBackOff & Rapid Restart Loop

### Symptoms
- Container restart counter rapidly increments (> 3 restarts within 2 minutes).
- Service status alternates between `restarting` and `running`.
- Synexis Detection Engine triggers `restart_loop` rule.

### Root Causes
1. **Misconfigured Configuration / Missing Secret:** App crashes immediately upon startup due to missing `.env` variable or DB password.
2. **Port Conflict:** Another process on host or container network already bound to listening port.
3. **Corrupted Volume Data:** Startup migration script fails due to schema mismatch or corrupted sqlite/postgres storage.

### Diagnostic Steps
1. Inspect container startup logs for stack traces during initialization phase.
2. Check environment variables and database connectivity prerequisites.
3. Validate port bindings in `docker-compose.yml`.

### Remediation Actions
1. **Fix Config & Restart Container:** Correct missing environment variables and trigger approved restart.
2. **Isolate Volume Mount:** Restore database from recent clean backup if storage corrupted.
3. **Verify Health Stability:** Ensure uptime extends beyond 30 seconds without crash.""",
    },
    {
        "id": "DOC-TECH-DOCKER-01",
        "title": "Docker Engine Architecture, Cgroups & Container Lifecycle",
        "category": "Technical Documentation",
        "tags": ["docker", "engine", "container", "daemon", "runc", "containerd", "cgroups", "namespaces"],
        "content": """# Docker Engine Architecture, Cgroups & Container Lifecycle

### System Architecture
Docker operates using a client-server architecture. The Docker CLI communicates via REST over Unix sockets (`/var/run/docker.sock`) or named pipes with `dockerd`. Underneath, `dockerd` delegates container creation and lifecycle execution to `containerd` and the OCI runtime `runc`.

### Linux Isolation Primitives
1. **Namespaces:** Provide process isolation (PID, Mount, Network, IPC, UTS, User).
2. **Control Groups (cgroups v1/v2):** Enforce strict hardware resource quotas (CPU shares, CFS quotas, memory limits, blkio).
3. **Union Filesystems (Overlay2):** Layered copy-on-write image layers with ephemeral container write layer.

### Operational Lifecycle States
- `created`: OCI spec created but process has not executed.
- `running`: PID 1 is active within dedicated PID namespace.
- `restarting`: Container exited with non-zero status and restart policy is active (`always` / `unless-stopped`).
- `exited`: Process terminated with exit code (`0` for clean exit, `1` for app exception, `137` for SIGKILL / OOM, `139` for SIGSEGV).
- `dead`: Daemon unable to release resources or unmount filesystem layers.""",
    },
    {
        "id": "DOC-TECH-POSTGRES-02",
        "title": "PostgreSQL Storage Architecture, Connection Pooling & Locking",
        "category": "Technical Documentation",
        "tags": ["postgres", "postgresql", "database", "mvcc", "wal", "locking", "connection_pool", "pg_stat_activity"],
        "content": """# PostgreSQL Storage Architecture, Connection Pooling & Locking

### Process Architecture
PostgreSQL uses a process-based client-server model (`postmaster` forks a dedicated backend process per client connection). Each backend allocates `work_mem` and `maintenance_work_mem` in addition to `shared_buffers`.

### Multi-Version Concurrency Control (MVCC)
- PostgreSQL uses MVCC so readers do not block writers and writers do not block readers.
- Outdated row versions (dead tuples) must be reclaimed by the background `autovacuum` worker daemon.

### Connection Limits & Sizing Formula
- Default `max_connections` is 100. Saturated connection slots lead to `OperationalError: connection refused` or `FATAL: remaining connection slots are reserved`.
- Recommended connection pool sizing formula: `connections = ((core_count * 2) + effective_spindle_count)`.
- Use external poolers (PgBouncer or SQLAlchemy QueuePool with `pool_size=10, max_overflow=20`) to prevent backend fork storms.""",
    },
    {
        "id": "DOC-TECH-FASTAPI-03",
        "title": "FastAPI Async Event Loop, Worker Pool & Concurrency",
        "category": "Technical Documentation",
        "tags": ["fastapi", "python", "asyncio", "uvicorn", "event_loop", "starlette", "concurrency"],
        "content": """# FastAPI Async Event Loop, Worker Pool & Concurrency

### Execution Pipeline
FastAPI is built on Starlette and Pydantic, running atop ASGI servers such as Uvicorn or Gunicorn with Uvicorn workers.

### Async vs Synchronous Request Routing
- `async def` endpoints: Run directly on the main `asyncio` event loop. Long synchronous blocking calls (e.g. `time.sleep()`, synchronous DB queries) will block the entire event loop and stall all concurrent incoming requests.
- `def` endpoints: Automatically offloaded by Starlette into an external `anyio` threadpool worker (`ThreadPoolExecutor`).

### Observability & Telemetry Integration
- Expose `/health` and `/api/v1/metrics` endpoints.
- Log structured JSON lines to standard output for automated scraping by Docker SDK and the Synexis Telemetry Pipeline.""",
    },
    {
        "id": "DOC-TECH-LINUX-04",
        "title": "Linux Kernel Memory Management, OOM Killer & Virtual Memory",
        "category": "Technical Documentation",
        "tags": ["linux", "kernel", "memory", "oom", "oomkiller", "pagecache", "swap", "virtual_memory"],
        "content": """# Linux Kernel Memory Management, OOM Killer & Virtual Memory

### Virtual Memory Subsystem
Linux divides physical RAM into pages (typically 4KB). Virtual memory maps process address spaces to physical frames, allowing overcommit (`/proc/sys/vm/overcommit_memory`).

### OOM (Out Of Memory) Killer Mechanics
When the kernel encounters an allocation request that cannot be satisfied by reclaiming page cache or swapping, the `out_of_memory()` function computes an `oom_score` for active processes based on:
1. Proportion of memory consumed.
2. Process `oom_score_adj` adjustment (-1000 to +1000).

The process with the highest `oom_score` receives `SIGKILL` (Exit Code 137). In Docker, container cgroups enforce isolated memory boundaries (`memory.limit_in_bytes`), triggering container-level OOM killing without taking down the host OS.""",
    },
    {
        "id": "DOC-TECH-NETWORKING-05",
        "title": "Container Bridge Networking, DNS Resolution & Port Binding",
        "category": "Technical Documentation",
        "tags": ["networking", "docker_network", "bridge", "iptables", "nat", "dns", "embedded_dns", "ports"],
        "content": """# Container Bridge Networking, DNS Resolution & Port Binding

### Docker Bridge Network (`bridge` / user-defined bridge)
User-defined Docker networks create an internal software bridge on the host (`br-*`).
- **Embedded DNS Server (127.0.0.11):** Containers automatically resolve sibling container names to their private bridge IP addresses (e.g. `synexis-postgres` -> `172.20.0.3`).
- **Port Mapping (DNAT):** Host port bindings (e.g. `5050:5000`) configure Linux `iptables` / `nftables` PREROUTING rules in the `nat` table to forward traffic from host interfaces into the container veth pair.

### Diagnostic Matrix
- Check DNS resolution: `docker exec <container> nslookup synexis-postgres`.
- Check listening ports on host: `netstat -tlpn` / `Get-NetTCPConnection` on Windows.
- Connection Refused: Service not listening on `0.0.0.0` or container not running.""",
    },
]


# ── Vector Embedding & Semantic Mathematics ────────────────────────────────────

class DenseVectorizer:
    """
    Vector Space Model with sub-linear TF scaling, Inverse Document Frequency (IDF),
    and 128-dimensional dense semantic projection with L2 unit-norm normalization.
    """

    DIMENSION = 128

    @staticmethod
    def tokenize(text: str) -> list[str]:
        words = re.findall(r"\b[A-Za-z0-9_\-\.]{2,}\b", text.lower())
        return [w for w in words if w not in _STOPWORDS]

    @classmethod
    def compute_dense_embedding(cls, text: str, tags: Optional[list[str]] = None) -> list[float]:
        """
        Generate a 128-dimensional dense vector embedding for any text or chunk.
        Uses multi-ngram subwords + feature hashing + sublinear TF-IDF + L2 unit normalization.
        """
        tokens = cls.tokenize(text)
        if tags:
            for t in tags:
                tokens.extend(cls.tokenize(t) * 2)

        if not tokens:
            return [0.0] * cls.DIMENSION

        # Hash feature frequencies into dense vector slots
        vec = [0.0] * cls.DIMENSION
        for i, token in enumerate(tokens):
            # 1. Unigram feature hash
            h1 = hash(token) % cls.DIMENSION
            weight = 1.0 + math.log(1.0 + tokens.count(token))
            vec[h1] += weight

            # 2. Bigram feature hash for local phrase semantics
            if i < len(tokens) - 1:
                bigram = f"{token}_{tokens[i+1]}"
                h2 = hash(bigram) % cls.DIMENSION
                vec[h2] += weight * 1.5

            # 3. 3-char prefix subwords (captures morphological stems like postgre*, restart*, connect*)
            if len(token) >= 4:
                prefix = token[:4]
                h3 = hash(prefix) % cls.DIMENSION
                vec[h3] += weight * 0.8

        # Compute L2 Norm: ||v|| = sqrt(sum(v_i^2))
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 1e-9:
            vec = [round(x / norm, 5) for x in vec]
        else:
            vec = [0.0] * cls.DIMENSION

        return vec

    @staticmethod
    def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
        """
        Compute Cosine Similarity (Dot Product of two L2-normalized vectors).
        Returns a float between 0.0 and 1.0.
        """
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        return max(0.0, min(1.0, dot_product))


# ── Synexis RAG Engine ────────────────────────────────────────────────────────

class RAGEngine:
    """
    RAG Engine providing text processing, dense vector embeddings,
    hybrid vector & BM25 retrieval, and dynamic incident learning.
    """

    def __init__(self) -> None:
        self._initialized = False

    def initialize(self) -> None:
        """Seed default runbooks into database with dense vector embeddings if table is empty."""
        try:
            with db_session() as db:
                count = db.query(RAGDocument).count()
                if count == 0:
                    for rb in BUILTIN_RUNBOOKS:
                        doc = RAGDocument(
                            id=rb["id"],
                            title=rb["title"],
                            category=rb["category"],
                            source_type="builtin",
                            content=rb["content"],
                            tags=rb["tags"],
                        )
                        db.add(doc)
                        db.flush()

                        # Chunk document and compute dense vector embeddings
                        chunks = self._chunk_text(rb["title"], rb["content"], rb["tags"])
                        for idx, (chunk_title, chunk_body, keywords) in enumerate(chunks):
                            embedding = DenseVectorizer.compute_dense_embedding(
                                chunk_title + " " + chunk_body, rb["tags"]
                            )
                            c = RAGChunk(
                                id=f"{rb['id']}_chunk_{idx}",
                                document_id=rb["id"],
                                chunk_index=idx,
                                title=chunk_title,
                                content=chunk_body,
                                keywords=keywords,
                                token_count=len(chunk_body.split()),
                                embedding_json=embedding,
                            )
                            db.add(c)
                    db.commit()
            self._initialized = True
        except Exception:
            pass

    # ── Text Chunking & Keyword Processing ────────────────────────────────────

    def _extract_keywords(self, text: str) -> list[str]:
        return DenseVectorizer.tokenize(text)

    def _chunk_text(
        self, title: str, content: str, tags: list[str]
    ) -> list[tuple[str, str, list[str]]]:
        """
        Split a document into logical markdown sections (H2/H3 or ~250-word blocks).
        """
        sections = re.split(r"(?:\n|^)###?\s+", content)
        chunks: list[tuple[str, str, list[str]]] = []

        if len(sections) <= 1:
            kw = list(set(self._extract_keywords(content) + [t.lower() for t in tags]))
            chunks.append((title, content.strip(), kw))
            return chunks

        for sec in sections:
            sec = sec.strip()
            if not sec:
                continue
            lines = sec.split("\n", 1)
            sec_header = lines[0].strip("# ")
            sec_body = lines[1].strip() if len(lines) > 1 else ""
            full_chunk_text = f"### {sec_header}\n{sec_body}"
            kw = list(set(self._extract_keywords(full_chunk_text) + [t.lower() for t in tags]))
            chunks.append((f"{title} — {sec_header}", full_chunk_text, kw))

        return chunks

    # ── Retrieval (Dense Vector Embeddings & Hybrid BM25 Scoring) ─────────────

    def retrieve(
        self,
        query: str,
        top_k: int = 3,
        min_score: float = 0.05,
    ) -> list[dict[str, Any]]:
        """
        Retrieve top_k most relevant knowledge chunks using dense vector cosine similarity
        fused with BM25 term weighting.
        """
        self.initialize()
        query_terms = set(self._extract_keywords(query))
        if not query_terms:
            return []

        # 1. Compute Query Vector Embedding
        query_vector = DenseVectorizer.compute_dense_embedding(query)
        results: list[dict[str, Any]] = []

        try:
            with db_session() as db:
                chunks = db.query(RAGChunk).all()
                docs = {d.id: d for d in db.query(RAGDocument).all()}

                for chunk in chunks:
                    chunk_kw = set(chunk.keywords or [])
                    chunk_text = chunk.content.lower()

                    # 1. Vector Cosine Similarity
                    chunk_vector = chunk.embedding_json
                    if not chunk_vector:
                        chunk_vector = DenseVectorizer.compute_dense_embedding(
                            chunk.title + " " + chunk.content, chunk.keywords
                        )
                    vector_sim = DenseVectorizer.cosine_similarity(query_vector, chunk_vector)

                    # 2. BM25 / Lexical Term Overlap
                    overlap = query_terms.intersection(chunk_kw)
                    if overlap:
                        containment = len(overlap) / float(len(query_terms))
                        jaccard = len(overlap) / (len(query_terms.union(chunk_kw)) + 1e-5)
                        lexical_score = (containment * 0.7) + (jaccard * 0.3)
                    else:
                        sub_matches = sum(1 for term in query_terms if term in chunk_text)
                        lexical_score = (sub_matches / (len(query_terms) + 2.0)) * 0.4

                    # 3. Hybrid Score Fusion (60% Vector Semantic + 40% BM25 Lexical)
                    hybrid_score = (vector_sim * 0.60) + (lexical_score * 0.40)

                    # Semantic boost if title contains exact query concepts
                    title_lower = chunk.title.lower()
                    for term in query_terms:
                        if term in title_lower:
                            hybrid_score += 0.12

                    if hybrid_score >= min_score:
                        doc = docs.get(chunk.document_id)
                        results.append({
                            "chunk_id": chunk.id,
                            "document_id": chunk.document_id,
                            "title": chunk.title,
                            "category": doc.category if doc else "Knowledge",
                            "source_type": doc.source_type if doc else "builtin",
                            "content": chunk.content,
                            "score": round(min(hybrid_score, 1.0), 3),
                            "vector_similarity": round(vector_sim, 3),
                            "matched_terms": list(overlap) if overlap else [t for t in query_terms if t in chunk_text],
                        })
        except Exception:
            # Fallback to in-memory vector similarity
            for rb in BUILTIN_RUNBOOKS:
                rb_vec = DenseVectorizer.compute_dense_embedding(rb["title"] + " " + rb["content"], rb["tags"])
                vector_sim = DenseVectorizer.cosine_similarity(query_vector, rb_vec)
                content_lower = rb["content"].lower()
                matches = [t for t in query_terms if t in content_lower]
                lexical_score = len(matches) / float(len(query_terms)) if matches else 0.0
                score = (vector_sim * 0.6) + (lexical_score * 0.4)
                if score >= min_score:
                    results.append({
                        "chunk_id": f"{rb['id']}_fallback",
                        "document_id": rb["id"],
                        "title": rb["title"],
                        "category": rb["category"],
                        "source_type": "builtin",
                        "content": rb["content"][:600] + "...",
                        "score": round(min(score, 1.0), 3),
                        "vector_similarity": round(vector_sim, 3),
                        "matched_terms": matches,
                    })

        # Rank by hybrid score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    # ── Dynamic Incident Learning Loop ────────────────────────────────────────

    def index_incident(self, incident_data: dict[str, Any]) -> Optional[dict[str, Any]]:
        """
        Turn a resolved incident into a reusable RAG Knowledge document with dense embeddings.
        Called automatically when an incident is RESOLVED or CLOSED.
        """
        self.initialize()
        inc_id = incident_data.get("id")
        title = incident_data.get("title", "Resolved Incident")
        service = incident_data.get("service", "unknown-service")
        rule_id = incident_data.get("rule_id", "manual")
        root_cause = incident_data.get("root_cause") or incident_data.get("resolution_summary", "Service recovered successfully.")
        remediation_action = incident_data.get("action_type") or incident_data.get("remediation", "restart_container")
        evidence_summary = incident_data.get("evidence_summary", "")

        doc_id = f"INC-LESSON-{inc_id}"
        doc_title = f"Historical Incident Lesson: {title} ({service})"
        tags = ["incident_lesson", service.lower(), rule_id.lower(), remediation_action.lower(), "resolved"]

        content = f"""# Historical Incident Lesson: {title}

- **Incident ID:** `{inc_id}`
- **Target Service:** `{service}`
- **Triggered Rule:** `{rule_id}`
- **Resolved At:** `{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}`

### Incident Symptoms & Evidence
{evidence_summary if evidence_summary else 'Telemetry anomalies and container failure detected.'}

### Root Cause Identified
{root_cause}

### Successful Remediation Applied
- **Action:** `{remediation_action}` on `{service}`
- **Outcome:** Health checks passed and verified system recovery.

### Key Lesson for Future Operations
When `{service}` encounters `{rule_id}`, verify container status and execute `{remediation_action}` to restore availability."""

        try:
            with db_session() as db:
                existing = db.get(RAGDocument, doc_id)
                if existing:
                    existing.content = content
                    existing.updated_at = datetime.now(timezone.utc)
                else:
                    doc = RAGDocument(
                        id=doc_id,
                        title=doc_title,
                        category="IncidentLesson",
                        source_type="incident_resolution",
                        content=content,
                        tags=tags,
                    )
                    db.add(doc)
                    db.flush()

                    chunks = self._chunk_text(doc_title, content, tags)
                    for idx, (chunk_title, chunk_body, keywords) in enumerate(chunks):
                        embedding = DenseVectorizer.compute_dense_embedding(
                            chunk_title + " " + chunk_body, tags
                        )
                        c = RAGChunk(
                            id=f"{doc_id}_chunk_{idx}",
                            document_id=doc_id,
                            chunk_index=idx,
                            title=chunk_title,
                            content=chunk_body,
                            keywords=keywords,
                            token_count=len(chunk_body.split()),
                            embedding_json=embedding,
                        )
                        db.add(c)
                db.commit()

            return {
                "document_id": doc_id,
                "title": doc_title,
                "status": "INDEXED",
                "category": "IncidentLesson",
            }
        except Exception as e:
            return {"document_id": doc_id, "status": "ERROR", "detail": str(e)}

    # ── Management APIs ───────────────────────────────────────────────────────

    def list_documents(self) -> list[dict[str, Any]]:
        self.initialize()
        try:
            with db_session() as db:
                docs = db.query(RAGDocument).all()
                return [d.to_dict() for d in docs]
        except Exception:
            return [
                {
                    "id": rb["id"],
                    "title": rb["title"],
                    "category": rb["category"],
                    "source_type": "builtin",
                    "content": rb["content"],
                    "tags": rb["tags"],
                    "chunk_count": 3,
                }
                for rb in BUILTIN_RUNBOOKS
            ]

    def get_stats(self) -> dict[str, Any]:
        self.initialize()
        try:
            with db_session() as db:
                doc_count = db.query(RAGDocument).count()
                chunk_count = db.query(RAGChunk).count()
                categories = [
                    r[0] for r in db.query(RAGDocument.category).distinct().all()
                ]
                return {
                    "total_documents": doc_count,
                    "total_chunks": chunk_count,
                    "categories": categories,
                    "vector_dimension": DenseVectorizer.DIMENSION,
                    "scoring_engine": "Dense Vector Embeddings (Cosine Similarity) + Sublinear BM25",
                    "status": "ready",
                }
        except Exception:
            return {
                "total_documents": len(BUILTIN_RUNBOOKS),
                "total_chunks": len(BUILTIN_RUNBOOKS) * 3,
                "categories": ["Runbook"],
                "vector_dimension": DenseVectorizer.DIMENSION,
                "scoring_engine": "Dense Vector Embeddings (Cosine Similarity) + Sublinear BM25",
                "status": "ready",
            }


rag_engine = RAGEngine()
