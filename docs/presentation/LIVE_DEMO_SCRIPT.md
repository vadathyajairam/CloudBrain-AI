# Synexis: Live Demonstration Script & Walkthrough Guide

**Target Duration:** 5–7 Minutes  
**Demonstration Scope:** Live Docker Sandbox Cluster (`synexis-demo-app`, `synexis-postgres`, `synexis-redis`)  
**Prerequisites:** Docker Desktop running, Sandbox containers active, Backend running on port 8000, Frontend running on port 3000.

---

## 1. Quick Terminal Setup Commands

### Terminal 1: Launch Docker Sandbox
```bash
docker compose -f sandbox/docker-compose.yml up -d --build
```
*Verify all 3 containers:*
```bash
docker ps --filter "name=synexis-"
```

### Terminal 2: Start Synexis Backend
```bash
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
python backend/run.py

# Linux / macOS:
source venv/bin/activate
python backend/run.py
```

### Terminal 3: Start Synexis Web Console
```bash
cd frontend
npm run dev
```

---

## 2. Minute-by-Minute Live Demonstration Walkthrough

### Phase 1: Baseline Healthy System (0:00 – 1:30)

1. **Open Browser:** Navigate to `http://localhost:3000`.
2. **Show Dashboard:**
   * Point to the top metric cards (CPU %, Memory %, Containers 3/3, Active Incidents 0).
   * **Presenter Speech:**
     > *"As you can see on the Synexis Dashboard, our local cluster is currently operating in a completely healthy state. Every card displays its exact data provenance—host compute is measured natively via psutil, and container metrics come directly from the Docker Engine SDK. Notice our live SVG telemetry chart showing continuous 3-second buffer streams with zero fake points."*
3. **Show Docker Containers View:**
   * Click **Containers** on the sidebar.
   * Point to `synexis-demo-app`, `synexis-postgres`, and `synexis-redis` running with green `HEALTHY` badges.
   * **Presenter Speech:**
     > *"In the Containers tab, we have our high-density SRE table showing our three sandbox microservices: the Flask demo app, PostgreSQL database, and Redis cache. All three are running with active health checks."*
4. **Show Log Stream:**
   * Click **Log Stream** on the sidebar.
   * Point to the live `INFO` logs showing successful database connections.

---

### Phase 2: Controlled Outage Injection & Autonomous Detection (1:30 – 2:45)

1. **Trigger Outage:**
   * Open Terminal 1 and run:
     ```bash
     docker stop synexis-postgres
     ```
   * *(Alternatively: Open **Chaos Lab** in UI and click **Trigger Database Failure**).*
2. **Observe Real-Time Cascading Errors:**
   * Return to **Log Stream** tab.
   * Point out the immediate red `ERROR` lines from `synexis-demo-app`:
     `psycopg2.OperationalError: could not connect to server: Connection refused`.
3. **Observe Autonomous Incident Detection:**
   * Within 2.8 seconds, point to the sidebar **Incidents** badge updating to `1` with a red highlight.
   * Navigate to **Incidents** tab.
   * Point to active incident card: `INC-00042: Database Stopped — synexis-postgres` (Severity: `CRITICAL`, Status: `DETECTED` $\to$ `INVESTIGATING`).
   * **Presenter Speech:**
     > *"We just stopped the PostgreSQL database container. In under three seconds, our background detection engine evaluated rule 'container_stopped', generated a deduplication key, and persisted incident INC-00042 into our database. Notice that demo-app is logging real connection refusal errors."*

---

### Phase 3: Evidence Gathering, Vector RAG & AI Root Cause Analysis (2:45 – 4:00)

1. **Open Investigation Panel:**
   * Click **Investigate** on `INC-00042`.
2. **Inspect Multi-Modal Evidence Bundle:**
   * Click **Evidence Bundle** tab.
   * Point out: Container state (`exited`, Exit Code 137), Container CPU dropping to 0.0%, and application error log traces.
3. **Inspect Dense Vector RAG Retrieval:**
   * Click **RAG Runbooks** tab.
   * Point out top retrieved runbook:
     * **Doc ID:** `RUNBOOK-DB-03`
     * **Title:** *PostgreSQL Database Connection Failure & Pool Exhaustion*
     * **Relevance Score:** `91.2% Match` (Cosine + BM25 hybrid ranking).
   * **Presenter Speech:**
     > *"Synexis automatically projects the incident symptoms into our 128-dimensional dense vector embedding space. It retrieves RUNBOOK-DB-03 with a 91.2% relevance score, giving our AI engine exact technical runbook instructions on how to handle container postmaster crashes."*
4. **Inspect AI RCA Diagnosis:**
   * Click **AI RCA Diagnosis** tab.
   * Show:
     * **Root Cause:** PostgreSQL daemon terminated unexpectedly.
     * **Confidence:** 95%.
     * **Ruled-out Alternative:** Network bridge partition (ruled out because redis was still responding).
     * **Structured Action Proposal:** `restart_container` targeting `synexis-postgres`.

---

### Phase 4: Human-in-the-Loop Rejection Test & Operator Approval (4:00 – 5:30)

1. **Navigate to Remediation Console:**
   * Click **Remediation & Audit** on the sidebar.
   * Point to the pending review card: `restart_container` on `synexis-postgres`.
2. **Demonstrate Rejection Safety:**
   * Click **[Reject]**.
   * Show that the action status changes to `REJECTED`.
   * Open terminal and run `docker ps` to prove that `synexis-postgres` **remains stopped**.
   * **Presenter Speech:**
     > *"To demonstrate our safety controls, the operator first clicks Reject. Notice that no Docker action occurred—the database container remains strictly stopped, and the rejection is committed to our audit log."*
3. **Trigger Approval & Execution:**
   * Set Operator to `sre_operator` (role: `admin`).
   * Click **[Approve & Execute Fix]**.
   * Point out the status switching to `EXECUTING...` and then `SUCCESS`.
   * **Presenter Speech:**
     > *"Now the authenticated SRE operator approves the action. The remediation engine validates that restart_container is in our allowlist and synexis-postgres is within our sandbox boundary. The Docker SDK executes the restart."*

---

### Phase 5: Real 4-Point Verification, Resolution & RAG Learning (5:30 – 7:00)

1. **Inspect 4-Point Health Verification Probes:**
   * Show the 4 checks turning green:
     1. `✓ Docker Process State: RUNNING (PID active)`
     2. `✓ Native Docker Healthcheck: HEALTHY (pg_isready exit code 0)`
     3. `✓ Application HTTP Probe: 200 OK (http://localhost:5050/health)`
     4. `✓ Error Log Quiescence: 0 errors in last 30s`
   * Point out the incident status transitioning to **`RESOLVED`**.
2. **Inspect Compliance Audit Trail:**
   * Scroll to the **Audit Trail** table.
   * Show the permanent row with timestamp, actor (`sre_operator`), action (`remediation.execute`), target (`synexis-postgres`), result (`SUCCESS`), and verification proof (`4/4 PASSED`).
3. **Inspect Grounded DevOps Copilot:**
   * Click **DevOps Copilot** on the sidebar.
   * Type: *"Why did PostgreSQL fail during the latest incident?"*
   * Show the grounded answer citing `INC-00042`, exit code 137, and `RUNBOOK-DB-03`.
4. **Conclude Demo:**
   * **Presenter Speech:**
     > *"All 4 health checks passed, resolving the incident in the database and automatically vectorizing the post-mortem into RAG as an IncidentLesson. Our DevOps Copilot can now answer questions grounded in this incident. This completes our verified, closed-loop demonstration of Synexis."*
