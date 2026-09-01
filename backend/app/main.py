"""RailSync-AI: Automated Block Planning System (ABPS) - FastAPI Backend.

Provides high-performance REST endpoints for corridor information, train schedules,
maintenance demand queues, CP-SAT optimization triggers, disruption simulation,
and digital safety token handshakes under Indian Railways G&SR rules.
"""

from datetime import datetime, timezone
import secrets
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

from app.data_mock import SAMPLE_DEMANDS, SAMPLE_TRAINS, STATIONS
from app.ml_scorer import calculate_criticality_score
from app.optimizer import optimize_blocks
from app.schemas import (
    DisruptionRequest,
    GrantBlockRequest,
    GrantBlockResponse,
    MaintenanceDemand,
    OptimizationMetrics,
    OptimizeResponse,
    ScheduledBlock,
    Station,
    Train,
)

# Counter for sequential Private Number generation
_pn_sequence = 1000


class StateStore:
    """In-memory state management for active operational data and safety authorizations."""

    def __init__(self) -> None:
        self.trains: List[Train] = []
        self.demands: List[MaintenanceDemand] = []
        self.scheduled_blocks: List[ScheduledBlock] = []
        self.metrics: Optional[OptimizationMetrics] = None
        self.granted_ptws: Dict[str, Dict[str, Any]] = {}
        self.reset()

    def reset(self, auto_optimize: bool = False) -> None:
        """Reset state to initial synthetic baseline fixtures."""
        self.trains = [t.model_copy(deep=True) for t in SAMPLE_TRAINS]
        self.demands = [
            d.model_copy(
                deep=True,
                update={"criticality_score": float(calculate_criticality_score(d))},
            )
            for d in SAMPLE_DEMANDS
        ]
        self.scheduled_blocks = []
        self.metrics = None
        self.granted_ptws = {}

        if auto_optimize:
            result = optimize_blocks(self.trains, self.demands)
            self.scheduled_blocks = result.scheduled_blocks
            self.metrics = result.metrics


state = StateStore()

app = FastAPI(
    title="RailSync-AI: Automated Block Planning System (ABPS)",
    description="Automated multi-department maintenance block planning & safety handshake engine.",
    version="1.0.0",
)

# Configure CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> Dict[str, str]:
    """Liveness and health check endpoint."""
    return {"status": "ok", "service": "RailSync-AI"}


@app.get("/api/corridor")
def get_corridor() -> Dict[str, Any]:
    """Retrieve corridor metadata and station chainage along the 106 KM route."""
    return {
        "corridor_name": "Ghaziabad - Aligarh",
        "length_km": 106.0,
        "stations": [s.model_dump() for s in STATIONS],
    }


@app.get("/api/trains", response_model=List[Train])
def get_trains() -> List[Train]:
    """Retrieve all active trains (including applied operational delays)."""
    return state.trains


@app.get("/api/demands", response_model=List[MaintenanceDemand])
def get_demands() -> List[MaintenanceDemand]:
    """Retrieve queued maintenance demands annotated with dynamic criticality scores."""
    return state.demands


@app.post("/api/optimize", response_model=OptimizeResponse)
def run_optimize() -> OptimizeResponse:
    """Execute the CP-SAT optimization solver and cache the resulting schedule."""
    result = optimize_blocks(state.trains, state.demands)

    # Re-apply any existing granted safety tokens
    for block in result.scheduled_blocks:
        if block.demand_id in state.granted_ptws:
            ptw_info = state.granted_ptws[block.demand_id]
            block.status = "GRANTED"
            block.ptw_id = ptw_info["ptw_id"]
            block.system_private_number = ptw_info["system_private_number"]

    state.scheduled_blocks = result.scheduled_blocks
    state.metrics = result.metrics
    return result


@app.post("/api/grant-safety-token", response_model=GrantBlockResponse)
def grant_safety_token(req: GrantBlockRequest) -> GrantBlockResponse:
    """Validate cross-departmental requirements and grant digital safety token under G&SR rules."""
    global _pn_sequence

    # Ensure scheduled blocks exist; auto-solve if unpopulated
    if not state.scheduled_blocks:
        result = optimize_blocks(state.trains, state.demands)
        state.scheduled_blocks = result.scheduled_blocks
        state.metrics = result.metrics

    # Locate targeted scheduled block
    target_block = next(
        (
            b
            for b in state.scheduled_blocks
            if b.demand_id == req.block_id or f"BLK-{b.demand_id}" == req.block_id
        ),
        None,
    )

    if target_block is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Block with ID '{req.block_id}' not found in current scheduled blocks.",
        )

    # Locate corresponding demand for safety clearance validation
    target_demand = next((d for d in state.demands if d.id == target_block.demand_id), None)

    # Power block requirement check: TPC Private Number MUST be provided if TRD power block required
    if target_demand and target_demand.power_block_required:
        if not req.tpc_private_number or not req.tpc_private_number.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Traction Power Controller (TPC) private number is required for traction power block clearance.",
            )

    # Sequential & cryptographically secure Private Number generation
    _pn_sequence += 1
    random_digits = f"{_pn_sequence:04d}{secrets.randbelow(90) + 10:02d}"
    system_private_number = f"PN-{random_digits}"

    # Permit to Work (PTW) generation
    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_hex = secrets.token_hex(2).upper()
    ptw_id = f"PTW-{today_str}-{random_hex}"
    ptw_timestamp = datetime.now(timezone.utc).isoformat()

    # Update scheduled block status in-place
    target_block.status = "GRANTED"
    target_block.ptw_id = ptw_id
    target_block.system_private_number = system_private_number

    # Save to audit registry
    ptw_record = {
        "block_id": req.block_id,
        "demand_id": target_block.demand_id,
        "system_private_number": system_private_number,
        "ptw_id": ptw_id,
        "ptw_timestamp": ptw_timestamp,
        "status": "GRANTED",
        "section_controller_id": req.section_controller_id,
        "tpc_private_number": req.tpc_private_number,
        "depot_supervisor_id": req.depot_supervisor_id,
    }
    state.granted_ptws[target_block.demand_id] = ptw_record
    state.granted_ptws[req.block_id] = ptw_record

    return GrantBlockResponse(
        block_id=req.block_id,
        system_private_number=system_private_number,
        ptw_id=ptw_id,
        ptw_timestamp=ptw_timestamp,
        status="GRANTED",
        message="Permit to Work (PTW) successfully authorized under G&SR Rule 4.19.",
    )


@app.post("/api/disruption/simulate", response_model=OptimizeResponse)
def simulate_disruption(req: DisruptionRequest) -> OptimizeResponse:
    """Inject train operational delays and re-optimize maintenance blocks adaptively."""
    train = next((t for t in state.trains if t.id == req.train_id), None)
    if train is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Train with ID '{req.train_id}' not found in active timetable.",
        )

    # Shift timetable occupancy windows
    train.dep_min += req.delay_minutes
    train.arr_min += req.delay_minutes

    # Re-optimize dynamically with shifted train intervals
    result = optimize_blocks(state.trains, state.demands)

    # Restore existing granted authorizations
    for block in result.scheduled_blocks:
        if block.demand_id in state.granted_ptws:
            ptw_info = state.granted_ptws[block.demand_id]
            block.status = "GRANTED"
            block.ptw_id = ptw_info["ptw_id"]
            block.system_private_number = ptw_info["system_private_number"]

    state.scheduled_blocks = result.scheduled_blocks
    state.metrics = result.metrics
    return result


@app.post("/api/reset")
def reset_schedule(reoptimize: bool = Query(default=False)) -> Dict[str, Any]:
    """Reset trains, demands, and scheduled blocks to baseline synthetic fixtures."""
    state.reset(auto_optimize=reoptimize)
    return {
        "status": "ok",
        "message": "System state reset to baseline fixtures successfully.",
        "reoptimized": reoptimize,
    }
