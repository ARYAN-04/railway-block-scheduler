"""Unit tests verifying Pydantic schema validation and synthetic data fixtures."""

import pytest
from app.data_mock import SAMPLE_DEMANDS, SAMPLE_TRAINS, STATIONS
from app.schemas import (
    Department,
    DisruptionRequest,
    GrantBlockRequest,
    GrantBlockResponse,
    MaintenanceDemand,
    MaintenanceSystem,
    OptimizationMetrics,
    OptimizeResponse,
    ScheduledBlock,
    Severity,
    Station,
    Train,
    TrainType,
)


def test_station_schema_and_mock_data():
    """Verify STATIONS data fixtures and Station schema parsing."""
    assert len(STATIONS) == 9
    first_station = STATIONS[0]
    last_station = STATIONS[-1]

    assert first_station.id == "GZB"
    assert first_station.km == 0.0
    assert last_station.id == "ALJN"
    assert last_station.km == 106.0

    # Ensure monotonic KM ordering
    kms = [s.km for s in STATIONS]
    assert kms == sorted(kms)

    # JSON roundtrip validation
    raw_json = first_station.model_dump_json()
    reparsed = Station.model_validate_json(raw_json)
    assert reparsed == first_station


def test_train_schema_and_mock_data():
    """Verify SAMPLE_TRAINS fixtures and Train schema."""
    assert len(SAMPLE_TRAINS) >= 6
    train_types = {t.type for t in SAMPLE_TRAINS}
    assert TrainType.PASSENGER_PREMIUM in train_types
    assert TrainType.PASSENGER_REGULAR in train_types
    assert TrainType.FREIGHT in train_types

    for train in SAMPLE_TRAINS:
        assert train.arr_min > train.dep_min
        assert 0.0 <= train.start_km < train.end_km <= 106.0
        assert 1 <= train.priority <= 3

        # Roundtrip check
        dumped = train.model_dump()
        assert Train.model_validate(dumped) == train


def test_maintenance_demand_schema_and_mock_data():
    """Verify SAMPLE_DEMANDS fixtures and MaintenanceDemand schema."""
    assert len(SAMPLE_DEMANDS) == 5
    departments = {d.department for d in SAMPLE_DEMANDS}
    assert Department.ENGINEERING in departments
    assert Department.TRACTION_TRD in departments
    assert Department.SIGNAL_TELECOM in departments

    systems = {d.system for d in SAMPLE_DEMANDS}
    assert MaintenanceSystem.TMS in systems
    assert MaintenanceSystem.TDMS in systems
    assert MaintenanceSystem.SMMS in systems

    for demand in SAMPLE_DEMANDS:
        assert demand.duration_minutes > 0
        assert demand.start_km <= demand.end_km
        assert demand.urgency_days_overdue >= 0
        assert demand.track_gmt > 0

        # Serialization roundtrip
        json_str = demand.model_dump_json()
        assert MaintenanceDemand.model_validate_json(json_str) == demand


def test_scheduled_block_schema():
    """Verify ScheduledBlock schema and defaults."""
    block = ScheduledBlock(
        demand_id="TMS-001",
        department=Department.ENGINEERING,
        system=MaintenanceSystem.TMS,
        activity="Plain Track Tamping",
        start_km=35.0,
        end_km=45.0,
        scheduled_start_min=180,
        scheduled_end_min=300,
        duration_minutes=120,
        criticality_score=85.5,
        is_bundled=True,
        bundled_with=["TDMS-002"],
        status="PLANNED",
    )
    assert block.is_bundled is True
    assert "TDMS-002" in block.bundled_with
    assert block.duration_minutes == block.scheduled_end_min - block.scheduled_start_min

    # Default values check
    simple_block = ScheduledBlock(
        demand_id="TMS-004",
        department=Department.ENGINEERING,
        system=MaintenanceSystem.TMS,
        activity="USFD",
        start_km=74.0,
        end_km=80.0,
        scheduled_start_min=120,
        scheduled_end_min=210,
        duration_minutes=90,
        criticality_score=72.0,
    )
    assert simple_block.is_bundled is False
    assert simple_block.bundled_with == []
    assert simple_block.status == "PLANNED"


def test_optimization_metrics_and_response_schema():
    """Verify OptimizationMetrics and OptimizeResponse."""
    metrics = OptimizationMetrics(
        uncoordinated_closure_hours=8.5,
        optimized_closure_hours=5.0,
        capacity_uptime_gained_percent=41.2,
        integrated_blocks_created=2,
        train_cancellations=0,
    )
    assert metrics.train_cancellations == 0

    block = ScheduledBlock(
        demand_id="TMS-001",
        department=Department.ENGINEERING,
        system=MaintenanceSystem.TMS,
        activity="Tamping",
        start_km=35.0,
        end_km=45.0,
        scheduled_start_min=180,
        scheduled_end_min=300,
        duration_minutes=120,
        criticality_score=85.0,
    )

    response = OptimizeResponse(
        scheduled_blocks=[block],
        metrics=metrics,
        uncoordinated_demands=SAMPLE_DEMANDS,
    )
    assert len(response.scheduled_blocks) == 1
    assert response.metrics.integrated_blocks_created == 2
    assert len(response.uncoordinated_demands) == 5

    # Verify JSON serialization
    json_repr = response.model_dump_json()
    assert "uncoordinated_closure_hours" in json_repr


def test_safety_handshake_schemas():
    """Verify GrantBlockRequest and GrantBlockResponse schemas."""
    request = GrantBlockRequest(
        block_id="BLK-001",
        section_controller_id="SC-DLI-01",
        tpc_private_number="PN-TRD-4821",
        depot_supervisor_id="DEPOT-GZB-09",
    )
    assert request.block_id == "BLK-001"

    response = GrantBlockResponse(
        block_id="BLK-001",
        system_private_number="PN-SYS-99412",
        ptw_id="PTW-2026-0902-001",
        ptw_timestamp="2026-09-02T04:00:00Z",
        status="GRANTED",
        message="Permit to work granted under G&SR Rule 4.19.",
    )
    assert response.status == "GRANTED"
    assert response.system_private_number.startswith("PN-SYS")


def test_disruption_request_schema():
    """Verify DisruptionRequest schema with optional and provided notes."""
    req1 = DisruptionRequest(train_id="12004", delay_minutes=25)
    assert req1.notes == ""

    req2 = DisruptionRequest(
        train_id="12424",
        delay_minutes=45,
        notes="OHE failure near Dadri",
    )
    assert req2.notes == "OHE failure near Dadri"
