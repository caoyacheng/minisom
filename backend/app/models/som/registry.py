from __future__ import annotations

import io
import json
import pickle
import uuid
from typing import Optional

from app.models.som.schemas import SomTrainingConfig
from app.models.som.vendor.minisom import MiniSom
from app.schemas import ModelRecord
from app.storage.blob_store import get_blob_store, sha256_hex
from app.storage.metadata_store import get_metadata_store

MODEL_TYPE = "som"


def load_som(model_id: str) -> MiniSom:
    meta = get_metadata_store()
    key = meta.get_model_weights_key(model_id)
    raw = get_blob_store().get(key)
    return pickle.loads(raw)


def save_model(
    som: MiniSom,
    config: SomTrainingConfig,
    metrics: dict[str, Optional[float]],
) -> ModelRecord:
    model_id = str(uuid.uuid4())
    buffer = io.BytesIO()
    pickle.dump(som, buffer)
    raw = buffer.getvalue()

    weights_key = f"models/{model_id}/v1/weights.pkl"
    manifest_key = f"models/{model_id}/v1/manifest.json"

    blob = get_blob_store()
    weights_uri = blob.put(weights_key, raw, content_type="application/octet-stream")

    manifest = {
        "model_id": model_id,
        "model_type": MODEL_TYPE,
        "format": "pickle",
        "feature_columns": config.feature_columns,
        "grid": {"x": config.grid_x, "y": config.grid_y},
    }
    manifest_bytes = json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")
    manifest_uri = blob.put(manifest_key, manifest_bytes, content_type="application/json")

    config_blob_key = f"models/{model_id}/v1/training_config.json"
    blob.put(
        config_blob_key,
        json.dumps(config.model_dump(), ensure_ascii=False, default=str).encode("utf-8"),
        content_type="application/json",
    )

    return get_metadata_store().save_model_version(
        model_id=model_id,
        name=config.model_name,
        model_type=MODEL_TYPE,
        dataset_id=config.dataset_id,
        weights_uri=weights_uri,
        weights_key=weights_key,
        manifest_uri=manifest_uri,
        manifest_key=manifest_key,
        content_sha256=sha256_hex(raw),
        size_bytes=len(raw),
        artifact_format="pickle",
        hyperparameters=config.model_dump(),
        metrics=metrics,
        feature_columns=config.feature_columns,
        label_column=config.label_column,
        normalize=config.normalize,
    )
