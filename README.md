# RailSync-AI: Automated Block Planning System (ABPS)

> **AI-powered Multi-Departmental Maintenance Possession Scheduling & Safety Handshake Platform for Indian Railways**

RailSync-AI eliminates maintenance silos across Indian Railways by harmonizing maintenance demands from **TMS** (Track Management System), **TDMS** (Traction Distribution Management System), and **SMMS** (Signalling Maintenance Management System) against live train operational timetables (**COA**).

Powered by a **Google OR-Tools CP-SAT** discrete optimization engine, RailSync-AI maximizes corridor capacity, eliminates train-maintenance collisions, creates multi-department **Integrated & Shadow Blocks**, and digitally enforces **G&SR Rule 15.06** safety protocols via verifiable Private Numbers (PN) and Permits to Work (PTW).

---

## Key Capabilities

- **Mathematical Optimization Engine (CP-SAT)**:
  - Multi-objective discrete solver formulating spatial segment disjunctive constraints (`AddNoOverlap`).
  - Strict zero train-possession collisions with configurable safety clearance buffers.
  - Cross-department joint bundling incentive rewards yielding $+56.3\%$ corridor capacity uptime and saving $4.5$ track closure hours.
- **Interactive Marey Chart (Time-Distance Diagram)**:
  - Custom SVG string chart mapping station chainage ($0.0-106.0$ KM, Ghaziabad to Aligarh) against time ($00:00-12:00$).
  - Color-coded train trajectory strings for Premium Passenger (Rajdhani/Shatabdi), Regular Passenger, and Freight rakes.
  - Shaded possession bounding boxes with dedicated visual indicators for integrated joint possessions and authorized work permits.
- **G&SR Digital Safety Handshake (BDMS / PTW)**:
  - Cryptographically secure sequential Private Number (`PN-XXXXXX`) issuance under Indian Railways General & Subsidiary Rules.
  - Enforces Traction Power Controller (TPC) electrical isolation confirmation before granting OHE blocks.
- **What-If Disruption Simulator & Real-Time Re-Planner**:
  - Interactive delay injection on live trains with immediate CP-SAT re-scheduling of maintenance windows to preserve train punctuality.

---

## System Architecture

```
railway-block-scheduler/
├── backend/
│   ├── pyproject.toml          # Workspace & dependencies managed via uv
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI REST router & G&SR handshake endpoints
│   │   ├── schemas.py          # Pydantic v2 domain schemas (Train, Demand, Block, Metrics)
│   │   ├── data_mock.py        # Ghaziabad–Aligarh (106 KM) corridor fixtures & timetable
│   │   ├── optimizer.py        # Google OR-Tools CP-SAT discrete solver engine
│   │   └── ml_scorer.py        # Defect Criticality Scoring (DCS) & ML risk estimator
│   └── tests/
│       ├── test_schemas.py     # Schema roundtrip and fixture tests
│       ├── test_optimizer.py   # Mathematical CP-SAT constraints & bundling tests
│       └── test_api.py         # End-to-end FastAPI endpoint integration tests
└── frontend/
    ├── package.json            # Managed via pnpm
    ├── vite.config.ts
    ├── src/
    │   ├── App.tsx             # Operations control room layout & state orchestration
    │   ├── api.ts              # Typed API service with offline fallback simulator
    │   ├── types.ts            # TypeScript domain interfaces mirroring backend models
    │   └── components/
    │       ├── MareyChart.tsx      # SVG Time-Distance string chart
    │       ├── KPICards.tsx        # Capacity uptime, closure hours & punctuality KPIs
    │       ├── DemandTable.tsx     # Filterable multi-department maintenance queue
    │       ├── HandshakeModal.tsx  # G&SR Rule 15.06 PTW / Private Number modal
    │       └── DisruptionPanel.tsx # What-if delay injection & re-optimizer UI
```

---

## Tech Stack

| Component | Technology | Role |
|---|---|---|
| **Backend Runtime** | Python 3.11+ via `uv` | Dependency isolation and execution |
| **API Framework** | FastAPI + Uvicorn | High-throughput asynchronous REST API |
| **Optimization** | Google OR-Tools (CP-SAT) | Constraint satisfaction & disjunctive scheduling |
| **ML / Scoring** | Scikit-Learn | Asset degradation risk evaluation & defect scoring |
| **Frontend Runtime**| React 19 + TypeScript via `pnpm` | Fast, reactive control-room dashboard |
| **Styling** | Tailwind CSS | Dark control-room theme (slate-950/900, cyan/emerald) |
| **Visualizations** | Custom SVG Canvas | Interactive Marey Time-Distance diagram |
| **Icons** | Lucide React | Operational indicators and badge icons |

---

## Quick Start Guide

### Prerequisites
- Python 3.11+ with [`uv`](https://docs.astral.sh/uv/) installed
- Node.js 18+ with [`pnpm`](https://pnpm.io/) installed

### 1. Backend Setup

```bash
cd backend

# Install dependencies into virtual environment
uv sync

# Run automated unit and integration tests (26 tests)
uv run pytest -v

# Start the FastAPI server
uv run uvicorn app.main:app --reload --port 8000
```

The API docs will be available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open `http://localhost:5173` in your browser to access the RailSync-AI Control Room.

To build the frontend for production:
```bash
cd frontend
pnpm build
```

---

## Corridor & Timetable Specification

- **Corridor**: Ghaziabad Jn (0.0 KM) $\leftrightarrow$ Aligarh Jn (106.0 KM) [Northern Railway / North Central Railway].
- **Key Stations**: Ghaziabad, Dadri, Boraki, Ajaibpur, Dankaur, Wair, Khurja Jn, Somna, Aligarh Jn.
- **Trains Included**:
  - `12004` Lucknow Shatabdi Express (Premium Passenger)
  - `12424` Dibrugarh Rajdhani Express (Premium Passenger)
  - `14218` Unchahar Express (Regular Passenger)
  - `12566` Bihar Sampark Kranti Express (Regular Passenger)
  - `BOXN-DTR` Dadri Thermal Coal Rake (Freight)
  - `BTPN-POL` Mathura Feeder POL Rake (Freight)
- **Maintenance Departments Integrated**:
  - **Engineering (TMS)**: Track tamping (CSM), USFD flaw removal
  - **Electrical / TRD (TDMS)**: Cantilever overhaul, neutral section inspection
  - **S&T (SMMS)**: Point machine replacement, signal testing

---

## License

MIT License. See [LICENSE](LICENSE) for details.
