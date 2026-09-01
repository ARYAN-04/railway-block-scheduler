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
- **Interactive Possession & Traffic Gantt Timeline**:
  - High-density horizontal Gantt timeline mapping spatial corridor lanes against the 12-hour operational window ($00:00-12:00$).
  - Sticky division lane column (`sticky left-0`) ensuring track divisions remain locked in view during horizontal navigation.
  - Color-coded possession bars with saturated high-contrast industrial palettes:
    - **Premium Passenger (Rajdhani/Shatabdi)**: Emerald green
    - **Regular Passenger Express**: Royal blue
    - **Freight Rakes**: Warm amber
    - **TMS Engineering (P-Way)**: Saturated teal
    - **TDMS Electrical (OHE)**: Saturated orange
    - **SMMS Signalling (S&T)**: Saturated indigo
    - **Integrated Joint Blocks**: Royal purple with `JOINT` badge
  - Persistent, fixed-height inspection dock displaying clearance windows, speed profiles, and safety parameters on hover without layout stutter.
  - Smooth, persistent horizontal scrollbar on by default to eliminate cursor boundary flickering.
- **High-Density Fleet & Demand Grid**:
  - Structured data table powered by a unified CSS Grid with pixel-aligned columns (`TRACK GMT`, `POWER BLK`, `SIG DISC`, `SCHEDULED SLOT`, `OPERATIONAL STATUS`).
  - Solid industrial department tags (`TMS`, `TDMS`, `SMMS`, `TRAIN`) and clean enterprise status boxes (`[ ● Operational > ]`, `[ ● Integrated Joint > ]`, `[ ● PTW Authorized > ]`).
- **On-Demand Corridor Efficiency & KPI Telemetry**:
  - On-demand modal dialog (`MetricsModal`) accessible from the navbar and toolbar, detailing capacity uplift ($+56.3\%$), closure reduction ($-4.5\text{h}$), and mathematical audit metrics without cluttering operational screens.
- **G&SR Digital Safety Handshake (BDMS / PTW)**:
  - Cryptographically secure sequential Private Number (`PN-XXXXXX`) issuance under Indian Railways General & Subsidiary Rules.
  - Enforces Traction Power Controller (TPC) electrical isolation confirmation before granting OHE blocks.
- **What-If Disruption Simulator & Real-Time Re-Planner**:
  - Interactive delay injection on live trains with dynamic button state tracking (`Inject Disruption` at baseline $\leftrightarrow$ `Trigger Adaptive Re-Planner` under active disruption).
  - Resilient baseline reset that automatically restores baseline timetables and solver fixtures without page reloads.

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
    ├── index.html              # Clean document metadata & overscroll containment
    ├── src/
    │   ├── App.tsx             # Enterprise dispatch control room & state orchestration
    │   ├── api.ts              # Resilient typed API service with offline fallback simulator
    │   ├── types.ts            # TypeScript domain interfaces mirroring backend models
    │   ├── index.css           # Clean light industrial theme & persistent scrollbars
    │   └── components/
    │       ├── GanttChart.tsx      # High-density Possession & Traffic Gantt timeline
    │       ├── DemandTable.tsx     # Pixel-aligned CSS Grid fleet & demand table
    │       ├── MetricsModal.tsx    # On-demand corridor capacity & efficiency telemetry
    │       ├── HandshakeModal.tsx  # G&SR Rule 15.06 PTW / Private Number authorization modal
    │       └── DisruptionPanel.tsx # What-if delay injection & adaptive re-planner drawer
```

---

## Tech Stack

| Component | Technology | Role |
|---|---|---|
| **Backend Runtime** | Python 3.11+ via `uv` | High-performance isolated Python workspace |
| **API Framework** | FastAPI + Uvicorn | Asynchronous REST API with automatic OpenAPI documentation |
| **Optimization** | Google OR-Tools (CP-SAT) | Disjunctive scheduling and constraint satisfaction solver |
| **ML / Scoring** | Scikit-Learn | Defect Criticality Scoring ($DCS_m \in [1, 100]$) & risk assessment |
| **Frontend Runtime**| React 19 + TypeScript via `pnpm` | Type-safe reactive control-room dashboard |
| **Styling** | Tailwind CSS | Clean light industrial dispatch theme (`#f1f5f9` canvas, `#0f172a` header) |
| **Visualizations** | Custom SVG / CSS Grid | High-density Gantt timeline and sticky spatial lanes |
| **Icons** | Lucide React | Clean, utilitarian operational indicators |

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

# Start the FastAPI server on port 8001
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

The interactive API docs will be available at `http://127.0.0.1:8001/docs`.

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
  - **Engineering (TMS)**: Track tamping (CSM), USFD rail flaw removal
  - **Electrical / TRD (TDMS)**: Cantilever wire overhaul, neutral section insulator testing
  - **Signalling (SMMS)**: Point machine replacement, signal disconnection interlocks

---

## License

MIT License.
