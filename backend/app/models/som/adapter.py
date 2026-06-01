from __future__ import annotations

from typing import Any, Callable, Optional

import numpy as np

from app.models.som import registry, service
from app.models.som.schemas import SomTrainingConfig
from app.models.som.vendor.minisom import MiniSom
from app.schemas import ModelRecord

MODEL_TYPE = "som"


class SomAdapter:
    model_type = MODEL_TYPE

    def load_training_data(
        self, config: SomTrainingConfig
    ) -> tuple[np.ndarray, Optional[list[Any]]]:
        return service.load_training_data(config)

    def train(
        self,
        config: SomTrainingConfig,
        data: np.ndarray,
        progress_callback: Optional[Callable[[int, int, float], None]] = None,
    ) -> MiniSom:
        return service.train_som(config, data, progress_callback)

    def evaluate(
        self,
        artifact: MiniSom,
        data: np.ndarray,
        labels: Optional[list[Any]] = None,
    ) -> dict[str, Any]:
        return service.evaluate_som(artifact, data, labels)

    def detect_anomalies(
        self,
        artifact: MiniSom,
        data: np.ndarray,
        row_ids: list[str],
        labels: Optional[list[Any]] = None,
    ) -> dict[str, Any]:
        return service.detect_anomalies(artifact, data, row_ids, labels)

    def visualizations(
        self, artifact: MiniSom, data: np.ndarray
    ) -> dict[str, Any]:
        return service.visualizations(artifact, data)

    def predict(
        self, artifact: MiniSom, samples: np.ndarray
    ) -> dict[str, Any]:
        return service.predict(artifact, samples)

    def load(self, model_id: str) -> MiniSom:
        return registry.load_som(model_id)

    def save(
        self,
        artifact: MiniSom,
        config: SomTrainingConfig,
        metrics: dict[str, Optional[float]],
    ) -> ModelRecord:
        return registry.save_model(artifact, config, metrics)

    def input_length(self, artifact: MiniSom) -> int:
        return artifact._input_len


adapter = SomAdapter()
