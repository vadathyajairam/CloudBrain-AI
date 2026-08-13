# Synexis — Sandbox Environment

The sandbox is a controlled set of Docker containers that Synexis monitors and manages.
It is completely isolated from your host operating system and production infrastructure.

## Architecture

| Container | Role | Host Port |
|---|---|---|
| `synexis-demo-app` / `cloudbrain-demo-app` | Flask demo service (generates real logs + chaos endpoints) | 5050 |
| `synexis-postgres` / `cloudbrain-postgres` | PostgreSQL database | 5433 |
| `synexis-redis` / `cloudbrain-redis` | Redis cache | 6380 |

Synexis filters to only `synexis-*` and `cloudbrain-*` containers — it will never touch any other Docker containers on your machine.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

## Quick Start

```bash
# From the project root:
docker compose -f sandbox/docker-compose.yml up -d --build

# Verify containers are running and healthy:
docker ps --filter "name=cloudbrain-"

# View demo app logs (Synexis collects these automatically):
docker logs -f cloudbrain-demo-app

# Stop the sandbox:
docker compose -f sandbox/docker-compose.yml down
```

## Chaos Endpoints (used by Synexis Chaos Sandbox)

The demo app exposes these endpoints for controlled failure injection:

| Method | Path | Effect |
|---|---|---|
| POST | `/chaos/cpu` | Start CPU stress threads |
| POST | `/chaos/errors` | Inject DB error logs + 5xx responses |
| POST | `/chaos/memory` | Allocate 75MB chunks (memory pressure) |
| POST | `/chaos/slow` | Add 2–5s latency to all responses |
| POST | `/chaos/reset` | Clear all active chaos scenarios |
| GET | `/chaos/status` | Current chaos state |

## Full Synexis Incident & RAG Walkthrough

1. Start sandbox (`docker compose up -d --build`)
2. Start Synexis backend (`python run.py`)
3. Start Synexis frontend (`npm run dev`)
4. Open `http://localhost:3000` → see monitored containers in Containers view
5. Open **Chaos Sandbox Lab** → choose "Database Stopped"
6. Synexis Anomaly Detection Engine detects failure → Incident created in database (`DETECTED`)
7. Synexis RAG Engine retrieves matching PostgreSQL runbook
8. Synexis AI RCA Engine diagnoses root cause with RAG citations
9. Operator reviews and clicks **Approve & Execute** on recommended remediation
10. Container restarts via Docker SDK → 4-Point Health Verification runs → Incident resolves (`RESOLVED`)
11. Incident resolution is automatically indexed into the Synexis RAG Knowledge Base
12. Audit log records full operator identity and verification results
