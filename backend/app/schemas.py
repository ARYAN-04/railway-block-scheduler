"""Pydantic schemas and domain models for RailSync-AI."""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class TrainType(str, Enum):
    PASSENGER_PREMIUM = "PASSENGER_PREMIUM"
    PASSENGER_REGULAR = "PASSENGER_REGULAR"
    FREIGHT = "FREIGHT"


class Department(str, Enum):
    ENGINEERING = "ENGINEERING"
    TRACTION_TRD = "TRACTION_TRD"
    SIGNAL_TELECOM = "SIGNAL_TELECOM"


class MaintenanceSystem(str, Enum):
    TMS = "TMS"
    TDMS = "TDMS"
    SMMS = "SMMS"


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    URGENT = "URGENT"
    ROUTINE = "ROUTINE"


class Station(BaseModel):
    id: str
    name: str
    km: float

    model_config = ConfigDict(from_attributes=True)


class Train(BaseModel):
    id: str
    name: str
    type: TrainType
    start_km: float
    end_km: float
    dep_min: int
    arr_min: int
    priority: int

    model_config = ConfigDict(from_attributes=True)


class MaintenanceDemand(BaseModel):
    id: str
    department: Department
    system: MaintenanceSystem
    asset_type: str
    activity: str
    start_km: float
    end_km: float
    duration_minutes: int
    urgency_days_overdue: int
    track_gmt: float
    severity: Severity
    power_block_required: bool
    signal_disconnection_required: bool
    criticality_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class ScheduledBlock(BaseModel):
    demand_id: str
    department: Department
    system: MaintenanceSystem
    activity: str
    start_km: float
    end_km: float
    scheduled_start_min: int
    scheduled_end_min: int
    duration_minutes: int
    criticality_score: float
    is_bundled: bool = False
    bundled_with: List[str] = Field(default_factory=list)
    status: str = "PLANNED"
    ptw_id: Optional[str] = None
    system_private_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class OptimizationMetrics(BaseModel):
    uncoordinated_closure_hours: float
    optimized_closure_hours: float
    capacity_uptime_gained_percent: float
    integrated_blocks_created: int
    train_cancellations: int = 0

    model_config = ConfigDict(from_attributes=True)


class GrantBlockRequest(BaseModel):
    block_id: str
    section_controller_id: str
    tpc_private_number: str
    depot_supervisor_id: str

    model_config = ConfigDict(from_attributes=True)


class GrantBlockResponse(BaseModel):
    block_id: str
    system_private_number: str
    ptw_id: str
    ptw_timestamp: str
    status: str
    message: str

    model_config = ConfigDict(from_attributes=True)


class DisruptionRequest(BaseModel):
    train_id: str
    delay_minutes: int
    notes: Optional[str] = ""

    model_config = ConfigDict(from_attributes=True)


class OptimizeResponse(BaseModel):
    scheduled_blocks: List[ScheduledBlock]
    metrics: OptimizationMetrics
    uncoordinated_demands: List[MaintenanceDemand]

    model_config = ConfigDict(from_attributes=True)
