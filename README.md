# CloudBrain AI 🧠☁️
> **Intelligent Cloud Operations & DevOps Assistant Platform**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)

---

## 🚀 Overview

CloudBrain AI is a real-time AI-powered cloud operations and DevOps assistant that:

- **Monitors** your system (CPU, RAM, Disk, Network) via real `psutil` telemetry
- **Manages** containerized microservices with a live sandbox cluster
- **Analyzes** logs and correlates signals to identify root causes
- **Detects** incidents automatically and generates AI-powered RCA reports
- **Remediates** failures with human-in-the-loop approval workflow
- **Demonstrates** chaos engineering with 5 realistic failure scenarios
- **Assists** via an AI DevOps Copilot chat (Google Gemini integration)

---

## 🏗️ Architecture

```
NEXT.JS FRONTEND (port 3000)
         │
    FastAPI Backend (port 8000)
         │
 ┌───────┼───────────┐
 ▼       ▼           ▼
Monitoring  Docker   Log Engine
(psutil)   Sandbox   (500 buffer)
         │
    AI Analysis Engine
         │
  ┌──────┼──────┐
  ▼      ▼      ▼
 RCA  Incidents Insights
         │
  Remediation Engine
         │
   User Approval → Action → Verify
```

---

## 📁 Project Structure

```
project-stage-1/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── monitoring.py        # Real psutil system metrics
│   │   │   ├── container_engine.py  # Sandbox container cluster
│   │   │   ├── log_engine.py        # Log buffer & pattern analysis
│   │   │   ├── ai_rca_engine.py     # Multi-modal root cause analysis
│   │   │   ├── chaos_engine.py      # 5 failure scenario injectors
│   │   │   ├── remediation_engine.py# Human-approved fix execution
│   │   │   ├── assistant_engine.py  # AI DevOps Copilot (Gemini)
│   │   │   └── config_analyzer.py   # Docker/k8s config security audit
│   │   ├── api/                     # FastAPI route handlers
│   │   ├── config.py                # App configuration
│   │   └── main.py                  # FastAPI app + background ticker
│   ├── tests/test_all.py            # Unit tests (6 tests, all passing)
│   ├── requirements.txt
│   └── run.py
│
└── frontend/
    ├── app/
    │   ├── components/
    │   │   ├── Navbar.tsx           # Full-width top bar
    │   │   ├── Sidebar.tsx          # Navigation sidebar
    │   │   ├── LiveChart.tsx        # Real-time SVG charts
    │   │   ├── MetricCard.tsx       # Metric display cards
    │   │   ├── ChaosModal.tsx       # Chaos scenario selector
    │   │   ├── DevOpsChatDrawer.tsx # AI Copilot chat drawer
    │   │   └── IncidentInvestigationModal.tsx
    │   ├── views/
    │   │   ├── DashboardView.tsx    # Main overview dashboard
    │   │   ├── MonitoringView.tsx
    │   │   ├── LogsView.tsx
    │   │   ├── AIRCAView.tsx
    │   │   ├── IncidentsView.tsx
    │   │   ├── ContainersView.tsx
    │   │   ├── ChaosView.tsx
    │   │   ├── RemediationView.tsx
    │   │   └── ConfigView.tsx
    │   ├── lib/api.ts               # Type-safe API client
    │   ├── page.tsx                 # App root
    │   └── globals.css              # Light theme design system
    ├── package.json
    └── next.config.ts
```

---

## ⚡ Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- (Optional) Google Gemini API Key for AI Copilot

### 1. Start Backend
```bash
cd backend
pip install -r requirements.txt
$env:PYTHONPATH=".."   # Windows (PowerShell)
python run.py
# → http://127.0.0.1:8000
# → http://127.0.0.1:8000/docs  (Swagger UI)
```

### 2. Start Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### 3. (Optional) Enable Gemini AI Copilot
Create `backend/.env`:
```env
GEMINI_API_KEY=your_key_here
```

---

## 🔥 Chaos → RCA → Remediation Demo

1. Open dashboard → click **Chaos Sandbox Lab**
2. Select a failure scenario (e.g. "API Retry Storm")
3. Watch metrics spike and logs fill with errors
4. Incident is auto-detected → AI performs RCA
5. Click **Investigate & Fix** → review evidence chain
6. **Approve** recommended action → system auto-recovers
7. CloudBrain verifies recovery with 4-point health check

---

## 🧪 Running Tests

```bash
cd backend
$env:PYTHONPATH="."  # PowerShell
python tests/test_all.py
# Ran 6 tests in 1.1s — OK
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Backend | FastAPI, Python 3.10+, Uvicorn |
| Monitoring | psutil (real OS telemetry) |
| AI | Google Gemini 1.5 Flash (optional) |
| Icons | Lucide React |
| Charts | Custom SVG (no external chart lib) |

---

## 📄 License

MIT License — Built for demonstration and educational purposes.
