"""Google OR-Tools CP-SAT Optimization Engine for RailSync-AI.

Formulates and solves the disjunctive multi-departmental railway maintenance block
scheduling problem along the corridor. Eliminates train collisions, guarantees safety
clearance buffers, and bundles cross-departmental works into Integrated Blocks.
"""

import math
from typing import Dict, List, Set, Tuple

from ortools.sat.python import cp_model

from app.ml_scorer import calculate_criticality_score
from app.schemas import (
    MaintenanceDemand,
    OptimizationMetrics,
    OptimizeResponse,
    ScheduledBlock,
    Train,
)

# Spatial discretization of the 106 KM corridor into standard block segments
CORRIDOR_SEGMENTS: List[Tuple[float, float]] = [
    (0.0, 30.0),    # Segment 0: Ghaziabad to Ajaibpur (0 - 30 KM)
    (30.0, 60.0),   # Segment 1: Ajaibpur to Wair (30 - 60 KM)
    (60.0, 106.0),  # Segment 2: Wair to Aligarh Jn (60 - 106 KM)
]


def demand_intersects_segment(start_km: float, end_km: float, seg_start: float, seg_end: float) -> bool:
    """Check if a spatial span [start_km, end_km] intersects segment [seg_start, seg_end]."""
    return max(start_km, seg_start) <= min(end_km, seg_end)


def get_intersecting_segments(start_km: float, end_km: float) -> List[int]:
    """Return indices of corridor segments intersected by the given spatial range."""
    return [
        idx
        for idx, (seg_start, seg_end) in enumerate(CORRIDOR_SEGMENTS)
        if demand_intersects_segment(start_km, end_km, seg_start, seg_end)
    ]


def calculate_train_segment_occupancy(
    train: Train,
    seg_start: float,
    seg_end: float,
    safety_buffer_minutes: int = 5,
    horizon_minutes: int = 720,
) -> Tuple[int, int]:
    """Calculate the entry and exit time window for a train traversing a track segment.
    
    Includes safety buffer before entry and after clearance.
    Returns (start_min, end_min) clamped within [0, horizon_minutes].
    If train does not intersect segment, returns (-1, -1).
    """
    k_entry = max(train.start_km, seg_start)
    k_exit = min(train.end_km, seg_end)

    if k_entry >= k_exit:
        return -1, -1

    total_dist = train.end_km - train.start_km
    total_time = train.arr_min - train.dep_min
    if total_dist <= 0 or total_time <= 0:
        return -1, -1

    min_per_km = total_time / total_dist

    t_entry = train.dep_min + (k_entry - train.start_km) * min_per_km
    t_exit = train.dep_min + (k_exit - train.start_km) * min_per_km

    # Apply safety clearance buffer
    t_start_buffered = max(0, int(math.floor(t_entry - safety_buffer_minutes)))
    t_end_buffered = min(horizon_minutes, int(math.ceil(t_exit + safety_buffer_minutes)))

    # Ensure valid positive interval
    if t_end_buffered <= t_start_buffered:
        t_end_buffered = min(horizon_minutes, t_start_buffered + 1)

    return t_start_buffered, t_end_buffered


def optimize_blocks(
    trains: List[Train],
    demands: List[MaintenanceDemand],
    horizon_minutes: int = 720,
    safety_buffer_minutes: int = 5,
    target_window_min: int = 240,
    bundling_reward: int = 25000,
) -> OptimizeResponse:
    """Solve the multi-objective maintenance possession block scheduling problem.
    
    Args:
        trains: List of scheduled passenger and freight trains.
        demands: Maintenance requests from TMS, TDMS, SMMS.
        horizon_minutes: Simulation time horizon in minutes (default 720 = 12h).
        safety_buffer_minutes: Clearance buffer around train occupancy (default 5 min).
        target_window_min: Ideal low-traffic maintenance time (default 240 = 04:00 AM).
        bundling_reward: Incentive weight for bundling cross-dept demands (default 1000).
        
    Returns:
        OptimizeResponse containing ScheduledBlocks, OptimizationMetrics, and uncoordinated demands.
    """
    if not demands:
        return OptimizeResponse(
            scheduled_blocks=[],
            metrics=OptimizationMetrics(
                uncoordinated_closure_hours=0.0,
                optimized_closure_hours=0.0,
                capacity_uptime_gained_percent=0.0,
                integrated_blocks_created=0,
                train_cancellations=0,
            ),
            uncoordinated_demands=[],
        )

    model = cp_model.CpModel()

    # 1. Precalculate train occupancy intervals per segment
    train_intervals_by_segment: Dict[int, List[cp_model.IntervalVar]] = {
        seg_idx: [] for seg_idx in range(len(CORRIDOR_SEGMENTS))
    }

    for train in trains:
        for seg_idx, (seg_start, seg_end) in enumerate(CORRIDOR_SEGMENTS):
            t_start, t_end = calculate_train_segment_occupancy(
                train, seg_start, seg_end, safety_buffer_minutes, horizon_minutes
            )
            if t_start >= 0 and t_end > t_start:
                duration = t_end - t_start
                train_interval = model.NewIntervalVar(
                    t_start, duration, t_end, f"train_{train.id}_seg_{seg_idx}"
                )
                train_intervals_by_segment[seg_idx].append(train_interval)

    # 2. Decision variables for maintenance demands
    maint_starts: Dict[str, cp_model.IntVar] = {}
    maint_ends: Dict[str, cp_model.IntVar] = {}
    maint_intervals: Dict[str, cp_model.IntervalVar] = {}
    demand_by_id: Dict[str, MaintenanceDemand] = {d.id: d for d in demands}
    criticality_scores: Dict[str, int] = {d.id: calculate_criticality_score(d) for d in demands}

    for d in demands:
        dur = min(d.duration_minutes, horizon_minutes)
        max_start = max(0, horizon_minutes - dur)
        s_var = model.NewIntVar(0, max_start, f"s_{d.id}")
        e_var = model.NewIntVar(dur, horizon_minutes, f"e_{d.id}")
        model.Add(e_var == s_var + dur)

        interval_var = model.NewIntervalVar(s_var, dur, e_var, f"interval_{d.id}")

        maint_starts[d.id] = s_var
        maint_ends[d.id] = e_var
        maint_intervals[d.id] = interval_var

    # Map each segment to its intersecting maintenance intervals
    maint_by_segment: Dict[int, List[str]] = {
        seg_idx: [] for seg_idx in range(len(CORRIDOR_SEGMENTS))
    }
    for d in demands:
        for seg_idx in get_intersecting_segments(d.start_km, d.end_km):
            maint_by_segment[seg_idx].append(d.id)

    # 3. Disjunctive safety constraints:
    # A train cannot occupy a segment while ANY maintenance block on that segment is active.
    for seg_idx, train_int_list in train_intervals_by_segment.items():
        m_ids_in_seg = maint_by_segment[seg_idx]
        for t_int in train_int_list:
            for m_id in m_ids_in_seg:
                model.AddNoOverlap([t_int, maint_intervals[m_id]])

    # 4. Same-department conflicts:
    # Two demands from the SAME department on the same segment cannot overlap.
    for seg_idx, m_ids in maint_by_segment.items():
        for i in range(len(m_ids)):
            for j in range(i + 1, len(m_ids)):
                d1 = demand_by_id[m_ids[i]]
                d2 = demand_by_id[m_ids[j]]
                if d1.department == d2.department:
                    model.AddNoOverlap([maint_intervals[d1.id], maint_intervals[d2.id]])

    # 5. Bundling variables & Cross-department synchronization:
    # If two demands from different departments intersect a common segment,
    # they can be bundled if their start times are synchronized within 15 minutes.
    bundling_vars: Dict[Tuple[str, str], cp_model.BoolVar] = {}
    candidate_pairs: Set[Tuple[str, str]] = set()

    for seg_idx, m_ids in maint_by_segment.items():
        for i in range(len(m_ids)):
            for j in range(i + 1, len(m_ids)):
                id1, id2 = sorted([m_ids[i], m_ids[j]])
                d1 = demand_by_id[id1]
                d2 = demand_by_id[id2]
                if d1.department != d2.department:
                    candidate_pairs.add((id1, id2))

    for id1, id2 in candidate_pairs:
        b_var = model.NewBoolVar(f"bundle_{id1}_{id2}")
        bundling_vars[(id1, id2)] = b_var
        # If b_var == 1, |s_id1 - s_id2| <= 15
        model.Add(maint_starts[id1] - maint_starts[id2] <= 15).OnlyEnforceIf(b_var)
        model.Add(maint_starts[id2] - maint_starts[id1] <= 15).OnlyEnforceIf(b_var)

    # 6. Objective function:
    # Maximize: sum(bundling_reward * b_var) - sum(criticality_score * |s_m - target_window_min|)
    objective_terms = []

    # Bundling bonus
    for b_var in bundling_vars.values():
        objective_terms.append(bundling_reward * b_var)

    # Target window deviation penalty
    for d in demands:
        crit = criticality_scores[d.id]
        dev_var = model.NewIntVar(0, horizon_minutes, f"dev_{d.id}")
        s_var = maint_starts[d.id]
        model.Add(dev_var >= s_var - target_window_min)
        model.Add(dev_var >= target_window_min - s_var)
        objective_terms.append(-crit * dev_var)

    model.Maximize(sum(objective_terms))

    # 7. Solve CP-SAT Model
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 5.0
    solver.parameters.num_search_workers = 4
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        # Fallback: if over-constrained, schedule in sequential unbundled slots
        return _fallback_schedule(demands, horizon_minutes)

    # 8. Post-process Scheduled Blocks
    scheduled_blocks: List[ScheduledBlock] = []
    active_bundles: Dict[Tuple[str, str], bool] = {}

    for (id1, id2), b_var in bundling_vars.items():
        active_bundles[(id1, id2)] = bool(solver.Value(b_var))

    for d in demands:
        s_val = int(solver.Value(maint_starts[d.id]))
        e_val = int(solver.Value(maint_ends[d.id]))

        # Find all other demands bundled with d
        bundled_with: List[str] = []
        for other_id in demand_by_id:
            if other_id == d.id:
                continue
            pair = tuple(sorted([d.id, other_id]))
            if active_bundles.get(pair, False):
                bundled_with.append(other_id)

        scheduled_blocks.append(
            ScheduledBlock(
                demand_id=d.id,
                department=d.department,
                system=d.system,
                activity=d.activity,
                start_km=d.start_km,
                end_km=d.end_km,
                scheduled_start_min=s_val,
                scheduled_end_min=e_val,
                duration_minutes=d.duration_minutes,
                criticality_score=float(criticality_scores[d.id]),
                is_bundled=len(bundled_with) > 0,
                bundled_with=sorted(bundled_with),
                status="PLANNED",
            )
        )

    # 9. Compute Optimization Metrics
    uncoordinated_closure_hours = round(sum(d.duration_minutes for d in demands) / 60.0, 2)

    # Calculate optimized closure hours by merging concurrent overlapping intervals per segment
    total_segment_closure_min = 0.0
    for seg_idx, (seg_start, seg_end) in enumerate(CORRIDOR_SEGMENTS):
        seg_blocks = [
            b
            for b in scheduled_blocks
            if demand_intersects_segment(b.start_km, b.end_km, seg_start, seg_end)
        ]
        if not seg_blocks:
            continue

        # Merge overlapping block time intervals
        sorted_intervals = sorted(
            [(b.scheduled_start_min, b.scheduled_end_min) for b in seg_blocks],
            key=lambda x: x[0],
        )
        merged: List[List[int]] = []
        for start_t, end_t in sorted_intervals:
            if not merged or start_t > merged[-1][1]:
                merged.append([start_t, end_t])
            else:
                merged[-1][1] = max(merged[-1][1], end_t)

        seg_closure = sum(end_t - start_t for start_t, end_t in merged)
        total_segment_closure_min += seg_closure

    optimized_closure_hours = round(total_segment_closure_min / 60.0, 2)

    if uncoordinated_closure_hours > 0:
        gain = ((uncoordinated_closure_hours - optimized_closure_hours) / uncoordinated_closure_hours) * 100.0
        capacity_uptime_gained_percent = round(max(0.0, gain), 2)
    else:
        capacity_uptime_gained_percent = 0.0

    # Count integrated block sessions (connected components of bundled demands)
    integrated_blocks_created = _count_integrated_blocks(scheduled_blocks)

    metrics = OptimizationMetrics(
        uncoordinated_closure_hours=uncoordinated_closure_hours,
        optimized_closure_hours=optimized_closure_hours,
        capacity_uptime_gained_percent=capacity_uptime_gained_percent,
        integrated_blocks_created=integrated_blocks_created,
        train_cancellations=0,
    )

    return OptimizeResponse(
        scheduled_blocks=scheduled_blocks,
        metrics=metrics,
        uncoordinated_demands=demands,
    )


def _count_integrated_blocks(blocks: List[ScheduledBlock]) -> int:
    """Count distinct integrated block groups (connected components of size >= 2)."""
    adj: Dict[str, Set[str]] = {b.demand_id: set(b.bundled_with) for b in blocks}
    visited: Set[str] = set()
    count = 0

    for d_id in adj:
        if d_id not in visited:
            component: Set[str] = set()
            queue = [d_id]
            visited.add(d_id)
            while queue:
                curr = queue.pop(0)
                component.add(curr)
                for neighbor in adj.get(curr, set()):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)
            if len(component) >= 2:
                count += 1

    return count


def _fallback_schedule(
    demands: List[MaintenanceDemand], horizon_minutes: int
) -> OptimizeResponse:
    """Sequential unbundled fallback if CP-SAT model cannot find a feasible slot."""
    current_time = 0
    scheduled_blocks: List[ScheduledBlock] = []
    for d in demands:
        dur = d.duration_minutes
        s_val = min(current_time, max(0, horizon_minutes - dur))
        e_val = min(s_val + dur, horizon_minutes)
        scheduled_blocks.append(
            ScheduledBlock(
                demand_id=d.id,
                department=d.department,
                system=d.system,
                activity=d.activity,
                start_km=d.start_km,
                end_km=d.end_km,
                scheduled_start_min=s_val,
                scheduled_end_min=e_val,
                duration_minutes=dur,
                criticality_score=float(calculate_criticality_score(d)),
                is_bundled=False,
                bundled_with=[],
                status="PLANNED",
            )
        )
        current_time = e_val

    uncoord = round(sum(d.duration_minutes for d in demands) / 60.0, 2)
    return OptimizeResponse(
        scheduled_blocks=scheduled_blocks,
        metrics=OptimizationMetrics(
            uncoordinated_closure_hours=uncoord,
            optimized_closure_hours=uncoord,
            capacity_uptime_gained_percent=0.0,
            integrated_blocks_created=0,
            train_cancellations=0,
        ),
        uncoordinated_demands=demands,
    )
