"""Synthetic corridor, timetable, and maintenance demand fixtures.

Models the Indian Railways Ghaziabad (GZB) – Aligarh (ALJN) 106 KM high-density corridor.
"""

from typing import List
from app.schemas import (
    Department,
    MaintenanceDemand,
    MaintenanceSystem,
    Severity,
    Station,
    Train,
    TrainType,
)

STATIONS: List[Station] = [
    Station(id="GZB", name="Ghaziabad Jn", km=0.0),
    Station(id="DER", name="Dadri", km=18.0),
    Station(id="BRKY", name="Boraki", km=24.0),
    Station(id="AJR", name="Ajaibpur", km=32.0),
    Station(id="DKDE", name="Dankaur", km=40.0),
    Station(id="WAIR", name="Wair", km=58.0),
    Station(id="KRJ", name="Khurja Jn", km=78.0),
    Station(id="SOM", name="Somna", km=92.0),
    Station(id="ALJN", name="Aligarh Jn", km=106.0),
]

SAMPLE_TRAINS: List[Train] = [
    Train(
        id="12004",
        name="Lucknow Shatabdi",
        type=TrainType.PASSENGER_PREMIUM,
        start_km=0.0,
        end_km=106.0,
        dep_min=360,  # 06:00 AM
        arr_min=430,  # 07:10 AM
        priority=1,
    ),
    Train(
        id="12424",
        name="Dibrugarh Rajdhani",
        type=TrainType.PASSENGER_PREMIUM,
        start_km=0.0,
        end_km=106.0,
        dep_min=410,  # 06:50 AM
        arr_min=480,  # 08:00 AM
        priority=1,
    ),
    Train(
        id="14218",
        name="Unchahar Express",
        type=TrainType.PASSENGER_REGULAR,
        start_km=0.0,
        end_km=106.0,
        dep_min=210,  # 03:30 AM
        arr_min=310,  # 05:10 AM
        priority=2,
    ),
    Train(
        id="12566",
        name="Bihar Sampark Kranti",
        type=TrainType.PASSENGER_REGULAR,
        start_km=0.0,
        end_km=106.0,
        dep_min=490,  # 08:10 AM
        arr_min=590,  # 09:50 AM
        priority=2,
    ),
    Train(
        id="BOXN-DTR",
        name="Dadri Thermal Coal",
        type=TrainType.FREIGHT,
        start_km=18.0,
        end_km=106.0,
        dep_min=60,   # 01:00 AM
        arr_min=200,  # 03:20 AM
        priority=3,
    ),
    Train(
        id="BTPN-POL",
        name="Mathura Feeder POL",
        type=TrainType.FREIGHT,
        start_km=0.0,
        end_km=78.0,
        dep_min=120,  # 02:00 AM
        arr_min=250,  # 04:10 AM
        priority=3,
    ),
]

SAMPLE_DEMANDS: List[MaintenanceDemand] = [
    MaintenanceDemand(
        id="TMS-001",
        department=Department.ENGINEERING,
        system=MaintenanceSystem.TMS,
        asset_type="Track / P-Way",
        activity="Plain Track Tamping (CSM)",
        start_km=35.0,
        end_km=45.0,
        duration_minutes=120,
        urgency_days_overdue=14,
        track_gmt=42.0,
        severity=Severity.CRITICAL,
        power_block_required=False,
        signal_disconnection_required=False,
    ),
    MaintenanceDemand(
        id="TDMS-002",
        department=Department.TRACTION_TRD,
        system=MaintenanceSystem.TDMS,
        asset_type="OHE / Catenary",
        activity="Cantilever & OHE wire overhaul",
        start_km=38.0,
        end_km=44.0,
        duration_minutes=105,
        urgency_days_overdue=8,
        track_gmt=42.0,
        severity=Severity.URGENT,
        power_block_required=True,
        signal_disconnection_required=False,
    ),
    MaintenanceDemand(
        id="SMMS-003",
        department=Department.SIGNAL_TELECOM,
        system=MaintenanceSystem.SMMS,
        asset_type="Point Machine",
        activity="Point Machine Replacement",
        start_km=40.0,
        end_km=40.0,
        duration_minutes=90,
        urgency_days_overdue=3,
        track_gmt=42.0,
        severity=Severity.ROUTINE,
        power_block_required=False,
        signal_disconnection_required=True,
    ),
    MaintenanceDemand(
        id="TMS-004",
        department=Department.ENGINEERING,
        system=MaintenanceSystem.TMS,
        asset_type="Rails",
        activity="USFD Rail Flaw Removal",
        start_km=74.0,
        end_km=80.0,
        duration_minutes=90,
        urgency_days_overdue=18,
        track_gmt=38.0,
        severity=Severity.CRITICAL,
        power_block_required=False,
        signal_disconnection_required=False,
    ),
    MaintenanceDemand(
        id="TDMS-005",
        department=Department.TRACTION_TRD,
        system=MaintenanceSystem.TDMS,
        asset_type="Neutral Section",
        activity="Neutral Section Insulator Check",
        start_km=75.0,
        end_km=79.0,
        duration_minutes=75,
        urgency_days_overdue=6,
        track_gmt=38.0,
        severity=Severity.ROUTINE,
        power_block_required=True,
        signal_disconnection_required=False,
    ),
]
