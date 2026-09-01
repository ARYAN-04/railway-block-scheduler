/**
 * RailSync-AI Domain Model Schemas & Interfaces
 * Mirrors backend Pydantic models defined in backend/app/schemas.py
 */

export interface Station {
  id: string;
  name: string;
  km: number;
}

export interface CorridorInfo {
  corridor_id: string;
  corridor_name: string;
  length_km: number;
  stations: Station[];
}

export type TrainType =
  | 'PASSENGER_PREMIUM'
  | 'PASSENGER_REGULAR'
  | 'FREIGHT';

export interface Train {
  id: string;
  name: string;
  type: TrainType;
  start_km: number;
  end_km: number;
  dep_min: number;
  arr_min: number;
  priority: number;
}

export type Department =
  | 'ENGINEERING'
  | 'TRACTION_TRD'
  | 'SIGNAL_TELECOM';

export type MaintenanceSystem =
  | 'TMS'
  | 'TDMS'
  | 'SMMS';

export type Severity =
  | 'CRITICAL'
  | 'URGENT'
  | 'ROUTINE';

export interface MaintenanceDemand {
  id: string;
  department: Department;
  system: MaintenanceSystem;
  asset_type: string;
  activity: string;
  start_km: number;
  end_km: number;
  duration_minutes: number;
  urgency_days_overdue: number;
  track_gmt: number;
  severity: Severity;
  power_block_required: boolean;
  signal_disconnection_required: boolean;
  criticality_score?: number;
}

export interface ScheduledBlock {
  demand_id: string;
  department: Department;
  system: MaintenanceSystem;
  activity: string;
  start_km: number;
  end_km: number;
  scheduled_start_min: number;
  scheduled_end_min: number;
  duration_minutes: number;
  criticality_score: number;
  is_bundled: boolean;
  bundled_with: string[];
  status: 'PENDING' | 'AUTHORIZED' | 'ACTIVE' | 'COMPLETED' | string;
  ptw_id?: string;
  system_private_number?: string;
}

export interface OptimizationMetrics {
  uncoordinated_closure_hours: number;
  optimized_closure_hours: number;
  capacity_uptime_gained_percent: number;
  integrated_blocks_created: number;
  train_cancellations: number;
}

export interface GrantBlockRequest {
  block_id: string;
  section_controller_id: string;
  tpc_private_number: string;
  depot_supervisor_id: string;
}

export interface GrantBlockResponse {
  block_id: string;
  section_controller_id?: string;
  tpc_private_number?: string;
  depot_supervisor_id?: string;
  system_private_number: string;
  ptw_id: string;
  ptw_timestamp: string;
  status: string;
  message?: string;
}

export interface DisruptionRequest {
  train_id: string;
  delay_minutes: number;
  notes?: string;
  speed_restriction_km_start?: number;
  speed_restriction_km_end?: number;
  max_speed_kmph?: number;
}

export interface OptimizeResponse {
  scheduled_blocks: ScheduledBlock[];
  metrics: OptimizationMetrics;
  uncoordinated_demands?: MaintenanceDemand[];
  execution_time_ms?: number;
  status?: string;
}

