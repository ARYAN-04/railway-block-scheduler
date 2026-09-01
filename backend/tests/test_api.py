"""Integration tests for RailSync-AI FastAPI REST API and Safety Handshake Protocol."""

import pytest
from fastapi.testclient import TestClient

from app.main import app, state
from app.optimizer import (
    CORRIDOR_SEGMENTS,
    calculate_train_segment_occupancy,
    get_intersecting_segments,
)
from app.schemas import Train


@pytest.fixture(autouse=True)
def reset_system_state():
    """Ensure every test begins with clean baseline fixtures."""
    client = TestClient(app)
    client.post("/api/reset")
    yield client
    client.post("/api/reset")


def test_health_check(reset_system_state):
    """Test /health endpoint."""
    client = reset_system_state
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "RailSync-AI"}


def test_get_corridor(reset_system_state):
    """Test /api/corridor metadata and station fixtures."""
    client = reset_system_state
    response = client.get("/api/corridor")
    assert response.status_code == 200
    data = response.json()
    assert data["corridor_name"] == "Ghaziabad - Aligarh"
    assert data["length_km"] == 106.0
    stations = data["stations"]
    assert len(stations) == 9
    assert stations[0]["id"] == "GZB"
    assert stations[0]["km"] == 0.0
    assert stations[-1]["id"] == "ALJN"
    assert stations[-1]["km"] == 106.0


def test_get_trains(reset_system_state):
    """Test /api/trains endpoint returns baseline active rakes."""
    client = reset_system_state
    response = client.get("/api/trains")
    assert response.status_code == 200
    trains = response.json()
    assert len(trains) == 6

    # Verify key passenger and freight rakes
    rajdhani = next(t for t in trains if t["id"] == "12424")
    assert rajdhani["name"] == "Dibrugarh Rajdhani"
    assert rajdhani["dep_min"] == 410
    assert rajdhani["arr_min"] == 480


def test_get_demands(reset_system_state):
    """Test /api/demands returns demands annotated with criticality scores."""
    client = reset_system_state
    response = client.get("/api/demands")
    assert response.status_code == 200
    demands = response.json()
    assert len(demands) == 5

    for d in demands:
        assert "criticality_score" in d
        assert 1 <= d["criticality_score"] <= 100


def test_optimize_endpoint(reset_system_state):
    """Test POST /api/optimize runs CP-SAT and returns blocks and metrics."""
    client = reset_system_state
    response = client.post("/api/optimize")
    assert response.status_code == 200
    data = response.json()

    # Verify scheduled blocks structure
    scheduled_blocks = data["scheduled_blocks"]
    assert len(scheduled_blocks) == 5
    for block in scheduled_blocks:
        assert block["scheduled_start_min"] < block["scheduled_end_min"]
        assert block["status"] == "PLANNED"

    # Verify metrics
    metrics = data["metrics"]
    assert metrics["uncoordinated_closure_hours"] > 0
    assert metrics["optimized_closure_hours"] <= metrics["uncoordinated_closure_hours"]
    assert metrics["capacity_uptime_gained_percent"] >= 0
    assert metrics["integrated_blocks_created"] >= 1
    assert metrics["train_cancellations"] == 0

    # Verify cross-department bundling
    bundled_blocks = [b for b in scheduled_blocks if b["is_bundled"]]
    assert len(bundled_blocks) >= 2


def test_grant_safety_token_validation_and_success(reset_system_state):
    """Test safety handshake authorization under G&SR rules."""
    client = reset_system_state
    # Initialize schedule
    client.post("/api/optimize")

    # 1. Test Power Block requirement failure: TDMS-002 requires power block
    fail_payload = {
        "block_id": "TDMS-002",
        "section_controller_id": "SC-DLI-NORTH",
        "tpc_private_number": "",  # Missing TPC authorization
        "depot_supervisor_id": "SUPERVISOR-GZB",
    }
    fail_res = client.post("/api/grant-safety-token", json=fail_payload)
    assert fail_res.status_code == 400
    assert "TPC" in fail_res.json()["detail"]

    # 2. Test Power Block requirement success with valid TPC number
    success_trd_payload = {
        "block_id": "TDMS-002",
        "section_controller_id": "SC-DLI-NORTH",
        "tpc_private_number": "TPC-ALJN-7721",
        "depot_supervisor_id": "SUPERVISOR-GZB",
    }
    success_trd_res = client.post("/api/grant-safety-token", json=success_trd_payload)
    assert success_trd_res.status_code == 200
    trd_data = success_trd_res.json()
    assert trd_data["block_id"] == "TDMS-002"
    assert trd_data["status"] == "GRANTED"
    assert trd_data["system_private_number"].startswith("PN-")
    assert trd_data["ptw_id"].startswith("PTW-")
    assert "ptw_timestamp" in trd_data

    # 3. Test non-power block requirement (TMS-001 Engineering P-Way)
    # TMS-001 has power_block_required=False, so empty tpc_private_number is allowed
    success_tms_payload = {
        "block_id": "TMS-001",
        "section_controller_id": "SC-DLI-NORTH",
        "tpc_private_number": "",
        "depot_supervisor_id": "SUPERVISOR-DKDE",
    }
    success_tms_res = client.post("/api/grant-safety-token", json=success_tms_payload)
    assert success_tms_res.status_code == 200
    tms_data = success_tms_res.json()
    assert tms_data["block_id"] == "TMS-001"
    assert tms_data["status"] == "GRANTED"
    assert tms_data["system_private_number"].startswith("PN-")

    # 4. Test invalid block ID returns 404
    invalid_payload = {
        "block_id": "NON-EXISTENT-BLK",
        "section_controller_id": "SC-DLI-NORTH",
        "tpc_private_number": "TPC-001",
        "depot_supervisor_id": "SUPERVISOR-01",
    }
    invalid_res = client.post("/api/grant-safety-token", json=invalid_payload)
    assert invalid_res.status_code == 404


def test_disruption_simulation_and_replanning(reset_system_state):
    """Test injecting train delay, re-optimizing dynamically, and verifying zero collisions."""
    client = reset_system_state
    # Baseline schedule
    client.post("/api/optimize")

    # Inject 45-minute delay on Dibrugarh Rajdhani (12424)
    disruption_payload = {
        "train_id": "12424",
        "delay_minutes": 45,
        "notes": "Delay due to fog near Ghaziabad",
    }
    response = client.post("/api/disruption/simulate", json=disruption_payload)
    assert response.status_code == 200
    data = response.json()

    # Verify train timetable shifted
    trains_res = client.get("/api/trains")
    assert trains_res.status_code == 200
    trains = [Train.model_validate(t) for t in trains_res.json()]
    rajdhani = next(t for t in trains if t.id == "12424")
    assert rajdhani.dep_min == 410 + 45  # 455
    assert rajdhani.arr_min == 480 + 45  # 525

    # Verify no collisions between any train and maintenance blocks
    scheduled_blocks = data["scheduled_blocks"]
    assert len(scheduled_blocks) == 5

    for block in scheduled_blocks:
        b_start_km = block["start_km"]
        b_end_km = block["end_km"]
        b_t_start = block["scheduled_start_min"]
        b_t_end = block["scheduled_end_min"]

        b_segments = get_intersecting_segments(b_start_km, b_end_km)

        for train in trains:
            for seg_idx in b_segments:
                seg_start, seg_end = CORRIDOR_SEGMENTS[seg_idx]
                t_entry, t_exit = calculate_train_segment_occupancy(
                    train, seg_start, seg_end, safety_buffer_minutes=5, horizon_minutes=720
                )
                if t_entry >= 0 and t_exit > t_entry:
                    # Disjunctive condition: [b_t_start, b_t_end] and [t_entry, t_exit] must not overlap
                    overlap = max(b_t_start, t_entry) < min(b_t_end, t_exit)
                    assert not overlap, (
                        f"Collision between block {block['demand_id']} [{b_t_start}, {b_t_end}] "
                        f"and train {train.id} [{t_entry}, {t_exit}] on segment {seg_idx}"
                    )


def test_disruption_invalid_train(reset_system_state):
    """Test disruption endpoint error handling for unknown train ID."""
    client = reset_system_state
    response = client.post(
        "/api/disruption/simulate",
        json={"train_id": "UNKNOWN-9999", "delay_minutes": 30},
    )
    assert response.status_code == 404


def test_reset_endpoint(reset_system_state):
    """Test POST /api/reset restores train timetables and resets schedule."""
    client = reset_system_state

    # First disrupt Rajdhani
    client.post(
        "/api/disruption/simulate",
        json={"train_id": "12424", "delay_minutes": 60},
    )

    # Confirm delayed
    trains_before = client.get("/api/trains").json()
    rajdhani_delayed = next(t for t in trains_before if t["id"] == "12424")
    assert rajdhani_delayed["dep_min"] == 470

    # Call reset
    reset_res = client.post("/api/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "ok"

    # Confirm restored to baseline
    trains_after = client.get("/api/trains").json()
    rajdhani_restored = next(t for t in trains_after if t["id"] == "12424")
    assert rajdhani_restored["dep_min"] == 410
    assert rajdhani_restored["arr_min"] == 480
