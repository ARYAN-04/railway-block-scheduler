"""Unit tests for RailSync-AI Optimization Engine and Scoring."""

import time
import pytest

from app.data_mock import SAMPLE_DEMANDS, SAMPLE_TRAINS
from app.ml_scorer import calculate_criticality_score, predict_risk
from app.optimizer import (
    CORRIDOR_SEGMENTS,
    calculate_train_segment_occupancy,
    demand_intersects_segment,
    get_intersecting_segments,
    optimize_blocks,
)
from app.schemas import (
    Department,
    MaintenanceDemand,
    MaintenanceSystem,
    Severity,
    Train,
    TrainType,
)


def test_calculate_criticality_score_known_demands():
    """Verify exact formula calculations for defect criticality scoring."""
    scores = {d.id: calculate_criticality_score(d) for d in SAMPLE_DEMANDS}
    # TMS-001: CRITICAL(70) + 2*10(20) + 4 = 94
    assert scores["TMS-001"] == 94
    # TDMS-002: URGENT(50) + 2*8(16) + 4 = 70
    assert scores["TDMS-002"] == 70
    # SMMS-003: ROUTINE(30) + 2*3(6) + 4 = 40
    assert scores["SMMS-003"] == 40
    # TMS-004: CRITICAL(70) + 2*10(20) + 3 = 93
    assert scores["TMS-004"] == 93
    # TDMS-005: ROUTINE(30) + 2*6(12) + 3 = 45
    assert scores["TDMS-005"] == 45


def test_criticality_score_clamping():
    """Verify score clamping between 1 and 100."""
    high_demand = MaintenanceDemand(
        id="HIGH-01",
        department=Department.ENGINEERING,
        system=MaintenanceSystem.TMS,
        asset_type="Rails",
        activity="Emergency",
        start_km=10.0,
        end_km=12.0,
        duration_minutes=60,
        urgency_days_overdue=100,
        track_gmt=150.0,
        severity=Severity.CRITICAL,
        power_block_required=True,
        signal_disconnection_required=True,
    )
    assert calculate_criticality_score(high_demand) == 100

    low_demand = MaintenanceDemand(
        id="LOW-01",
        department=Department.SIGNAL_TELECOM,
        system=MaintenanceSystem.SMMS,
        asset_type="Cables",
        activity="Inspection",
        start_km=10.0,
        end_km=12.0,
        duration_minutes=30,
        urgency_days_overdue=0,
        track_gmt=0.0,
        severity=Severity.ROUTINE,
        power_block_required=False,
        signal_disconnection_required=False,
    )
    assert calculate_criticality_score(low_demand) == 30


def test_ml_risk_estimator():
    """Verify ML risk estimator returns valid predictions and probabilities."""
    res = predict_risk(SAMPLE_DEMANDS[0])
    assert "predicted_risk_index" in res
    assert "criticality_score" in res
    assert "failure_probability_48h" in res
    assert 0.0 <= res["failure_probability_48h"] <= 1.0
    assert res["criticality_score"] == 94
    assert res["requires_immediate_isolation"] is True


def test_spatial_discretization():
    """Verify segment intersection logic."""
    # TMS-001 (km 35-45) intersects Segment 1 (30 - 60 KM)
    seg_indices = get_intersecting_segments(35.0, 45.0)
    assert seg_indices == [1]

    # SMMS-003 (km 40-40) intersects Segment 1 (30 - 60 KM)
    seg_indices_pt = get_intersecting_segments(40.0, 40.0)
    assert seg_indices_pt == [1]

    # Boundary spanning (km 25 - 35) intersects Segment 0 (0-30) and Segment 1 (30-60)
    spanning = get_intersecting_segments(25.0, 35.0)
    assert spanning == [0, 1]


def test_train_occupancy_calculation():
    """Verify linear interpolation of train occupancy and safety buffer."""
    test_train = Train(
        id="TEST-1",
        name="Test Express",
        type=TrainType.PASSENGER_PREMIUM,
        start_km=0.0,
        end_km=100.0,
        dep_min=100,
        arr_min=200,
        priority=1,
    )
    # Traversing 30 to 60 KM (distance 30 km, total 100 km, speed 1 km/min)
    # Entry at min 130, exit at min 160.
    # With safety buffer 5: start <= 125, end >= 165
    t_start, t_end = calculate_train_segment_occupancy(
        test_train, 30.0, 60.0, safety_buffer_minutes=5, horizon_minutes=720
    )
    assert t_start == 125
    assert t_end == 165


def test_optimizer_speed_and_completion():
    """Verify solver execution completes under 1 second on standard fixtures."""
    start_time = time.perf_counter()
    response = optimize_blocks(SAMPLE_TRAINS, SAMPLE_DEMANDS, horizon_minutes=720)
    elapsed = time.perf_counter() - start_time

    assert elapsed < 1.0, f"Solver took too long: {elapsed:.2f}s"
    assert len(response.scheduled_blocks) == len(SAMPLE_DEMANDS)
    assert response.metrics.train_cancellations == 0


def test_no_train_maintenance_overlap():
    """Verify zero overlap between any scheduled block and train in the same segment."""
    response = optimize_blocks(
        SAMPLE_TRAINS, SAMPLE_DEMANDS, horizon_minutes=720, safety_buffer_minutes=5
    )

    for block in response.scheduled_blocks:
        block_segments = get_intersecting_segments(block.start_km, block.end_km)
        for seg_idx in block_segments:
            seg_start, seg_end = CORRIDOR_SEGMENTS[seg_idx]
            for train in SAMPLE_TRAINS:
                t_start, t_end = calculate_train_segment_occupancy(
                    train, seg_start, seg_end, safety_buffer_minutes=5, horizon_minutes=720
                )
                if t_start >= 0 and t_end > t_start:
                    # Check for overlap between [block.start, block.end] and [t_start, t_end]
                    has_overlap = max(block.scheduled_start_min, t_start) < min(
                        block.scheduled_end_min, t_end
                    )
                    assert not has_overlap, (
                        f"Collision detected on Segment {seg_idx} ({seg_start}-{seg_end}km)! "
                        f"Block {block.demand_id} [{block.scheduled_start_min}, {block.scheduled_end_min}] "
                        f"overlaps Train {train.id} [{t_start}, {t_end}]"
                    )


def test_bundling_detection():
    """Verify multi-department demands in the same section are bundled into integrated blocks."""
    response = optimize_blocks(SAMPLE_TRAINS, SAMPLE_DEMANDS, horizon_minutes=720)

    block_map = {b.demand_id: b for b in response.scheduled_blocks}

    # TMS-001 (Engineering) and TDMS-002 (Traction) are both around Dankaur (~40km, Segment 1)
    tms1 = block_map["TMS-001"]
    tdms2 = block_map["TDMS-002"]
    smms3 = block_map["SMMS-003"]

    assert tms1.is_bundled is True
    assert tdms2.is_bundled is True
    assert "TDMS-002" in tms1.bundled_with
    assert "TMS-001" in tdms2.bundled_with

    # Synchronized start within 15 minutes
    assert abs(tms1.scheduled_start_min - tdms2.scheduled_start_min) <= 15
    assert abs(tms1.scheduled_start_min - smms3.scheduled_start_min) <= 15

    # TMS-004 and TDMS-005 in Segment 2
    tms4 = block_map["TMS-004"]
    tdms5 = block_map["TDMS-005"]
    assert tms4.is_bundled is True
    assert tdms5.is_bundled is True
    assert "TDMS-005" in tms4.bundled_with
    assert "TMS-004" in tdms5.bundled_with

    # Exactly 2 integrated blocks created (Dankaur cluster and Khurja cluster)
    assert response.metrics.integrated_blocks_created == 2


def test_optimization_metrics_accuracy():
    """Verify closure hours and capacity gain calculations."""
    response = optimize_blocks(SAMPLE_TRAINS, SAMPLE_DEMANDS, horizon_minutes=720)
    metrics = response.metrics

    # Sum of durations: 120 + 105 + 90 + 90 + 75 = 480 min = 8.0 hours
    assert metrics.uncoordinated_closure_hours == 8.0
    # Merged closure: Segment 1 (max 120 min = 2.0h) + Segment 2 (max 90 min = 1.5h) = 3.5h
    assert metrics.optimized_closure_hours == 3.5
    # Uptime gained: (8.0 - 3.5)/8.0 = 56.25%
    assert metrics.capacity_uptime_gained_percent == 56.25
    assert metrics.train_cancellations == 0


def test_empty_demands_graceful_handling():
    """Verify optimizer handles empty demands list."""
    response = optimize_blocks(SAMPLE_TRAINS, [], horizon_minutes=720)
    assert response.scheduled_blocks == []
    assert response.metrics.uncoordinated_closure_hours == 0.0
    assert response.metrics.optimized_closure_hours == 0.0
    assert response.metrics.capacity_uptime_gained_percent == 0.0
    assert response.metrics.integrated_blocks_created == 0
