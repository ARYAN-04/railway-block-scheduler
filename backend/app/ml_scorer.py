"""Defect Criticality Scoring and Risk Estimation Engine.

Calculates Defect Criticality Scores (DCS) based on severity, days overdue,
and track gross million tonnes (GMT) per Indian Railways track degradation standards.
Also provides a lightweight ML risk degradation estimator.
"""

from typing import Any, Dict
import numpy as np
from sklearn.linear_model import Ridge

from app.schemas import MaintenanceDemand, Severity


def calculate_criticality_score(demand: MaintenanceDemand) -> int:
    """Calculate the Defect Criticality Score (DCS) for a maintenance demand.
    
    Formula:
      - Base severity: CRITICAL = 70, URGENT = 50, ROUTINE = 30
      - Overdue penalty: + 2 * min(10, max(0, urgency_days_overdue))
      - Track GMT penalty: + min(10, int(track_gmt // 10))
      - Clamped between 1 and 100
    """
    severity_map = {
        Severity.CRITICAL: 70,
        Severity.URGENT: 50,
        Severity.ROUTINE: 30,
    }
    base = severity_map.get(demand.severity, 30)
    overdue_penalty = 2 * min(10, max(0, demand.urgency_days_overdue))
    gmt_penalty = min(10, int(demand.track_gmt // 10))

    raw_score = base + overdue_penalty + gmt_penalty
    return max(1, min(100, raw_score))


class MLRiskEstimator:
    """Lightweight scikit-learn risk estimator for predicting asset degradation rate."""

    def __init__(self) -> None:
        self.model = Ridge(alpha=1.0)
        self._is_trained = False
        self._initialize_synthetic_baseline()

    def _extract_features(self, demand: MaintenanceDemand) -> np.ndarray:
        severity_ord = {
            Severity.ROUTINE: 1.0,
            Severity.URGENT: 2.0,
            Severity.CRITICAL: 3.0,
        }.get(demand.severity, 1.0)

        features = [
            float(demand.urgency_days_overdue),
            float(demand.track_gmt),
            float(demand.duration_minutes),
            severity_ord,
            1.0 if demand.power_block_required else 0.0,
            1.0 if demand.signal_disconnection_required else 0.0,
            float(demand.end_km - demand.start_km),
        ]
        return np.array(features, dtype=np.float64).reshape(1, -1)

    def _initialize_synthetic_baseline(self) -> None:
        """Pre-fits a baseline model on synthetic degradation training tuples."""
        # Features: [overdue, gmt, duration, severity, power, signal, km_span]
        X_syn = np.array(
            [
                [0.0, 20.0, 60.0, 1.0, 0.0, 0.0, 2.0],
                [5.0, 30.0, 90.0, 2.0, 1.0, 0.0, 5.0],
                [15.0, 50.0, 120.0, 3.0, 1.0, 1.0, 10.0],
                [2.0, 25.0, 45.0, 1.0, 0.0, 1.0, 1.0],
                [10.0, 45.0, 105.0, 2.0, 1.0, 0.0, 6.0],
                [20.0, 60.0, 150.0, 3.0, 1.0, 1.0, 12.0],
            ],
            dtype=np.float64,
        )
        # Synthetic 48-hour failure risk index (0 - 100)
        y_syn = np.array([15.0, 45.0, 85.0, 22.0, 60.0, 95.0], dtype=np.float64)
        self.model.fit(X_syn, y_syn)
        self._is_trained = True

    def predict_degradation_risk(self, demand: MaintenanceDemand) -> Dict[str, Any]:
        """Predicts estimated asset degradation risk and failure probability."""
        if not self._is_trained:
            self._initialize_synthetic_baseline()

        feats = self._extract_features(demand)
        raw_pred = float(self.model.predict(feats)[0])
        clamped_pred = max(0.0, min(100.0, raw_pred))
        criticality = calculate_criticality_score(demand)

        return {
            "predicted_risk_index": round(clamped_pred, 2),
            "criticality_score": criticality,
            "failure_probability_48h": round(clamped_pred / 100.0, 3),
            "requires_immediate_isolation": criticality >= 80 or clamped_pred >= 80.0,
        }


# Module singleton
_estimator = MLRiskEstimator()


def predict_risk(demand: MaintenanceDemand) -> Dict[str, Any]:
    """Convenience helper for predicting risk degradation on a demand."""
    return _estimator.predict_degradation_risk(demand)
