from __future__ import annotations

from typing import Any, Optional

from app.models import get_adapter
from app.schemas import ModelRecord
from app.storage.blob_store import get_blob_store
from app.storage.metadata_store import get_metadata_store


def list_models() -> tuple[list[ModelRecord], Optional[str]]:
    return get_metadata_store().list_models()


def get_model(model_id: str) -> ModelRecord:
    return get_metadata_store().get_model(model_id)


def load_artifact(model_id: str) -> Any:
    model = get_model(model_id)
    return get_adapter(model.model_type).load(model_id)


def get_model_weights_bytes(model_id: str) -> bytes:
    meta = get_metadata_store()
    key = meta.get_model_weights_key(model_id)
    return get_blob_store().get(key)


def activate_model(model_id: str) -> ModelRecord:
    return get_metadata_store().activate_model(model_id)


def delete_model(model_id: str) -> None:
    keys = get_metadata_store().delete_model(model_id)
    blob = get_blob_store()
    for key in keys:
        blob.delete(key)


def get_active_model_id() -> Optional[str]:
    return get_metadata_store().get_active_model_id()
