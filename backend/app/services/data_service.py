from __future__ import annotations

import io
import uuid
from typing import Any, Optional

import numpy as np
import pandas as pd

from app.services.column_aliases import resolve_columns, resolve_label_column
from app.storage.blob_store import get_blob_store, sha256_hex
from app.storage.metadata_store import get_metadata_store


def list_datasets() -> list[dict[str, Any]]:
    return get_metadata_store().list_datasets()


def save_dataset(file_bytes: bytes, filename: str) -> dict[str, Any]:
    dataset_id = str(uuid.uuid4())
    blob_key = f"datasets/{dataset_id}/data.csv"
    blob = get_blob_store()
    storage_uri = blob.put(blob_key, file_bytes, content_type="text/csv")

    df = pd.read_csv(io.BytesIO(file_bytes))
    numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
    preview = df.head(10).replace({np.nan: None}).to_dict(orient="records")

    meta = get_metadata_store().save_dataset(
        dataset_id=dataset_id,
        name=filename,
        storage_uri=storage_uri,
        blob_key=blob_key,
        content_sha256=sha256_hex(file_bytes),
        size_bytes=len(file_bytes),
        rows=len(df),
        columns=df.columns.tolist(),
        numeric_columns=numeric_columns,
    )

    return {
        **meta,
        "preview": preview,
    }


def get_dataset_meta(dataset_id: str) -> dict[str, Any]:
    return get_metadata_store().get_dataset_meta(dataset_id)


def get_dataset_bytes(dataset_id: str) -> bytes:
    meta = get_metadata_store().get_dataset_meta(dataset_id)
    return get_blob_store().get(meta["blob_key"])


def get_dataset_preview(dataset_id: str, limit: int = 10) -> dict[str, Any]:
    meta = get_dataset_meta(dataset_id)
    df = pd.read_csv(io.BytesIO(get_dataset_bytes(dataset_id)))
    meta["preview"] = df.head(limit).replace({np.nan: None}).to_dict(orient="records")
    return meta


def load_feature_matrix(
    dataset_id: str,
    feature_columns: list[str],
    normalize: bool = True,
) -> np.ndarray:
    df = pd.read_csv(io.BytesIO(get_dataset_bytes(dataset_id)))
    actual_columns = resolve_columns(feature_columns, df.columns.tolist())

    data = df[actual_columns].astype(float).values
    if normalize:
        mean = data.mean(axis=0)
        std = data.std(axis=0)
        std[std == 0] = 1.0
        data = (data - mean) / std
    return data


def load_labels(
    dataset_id: str,
    label_column: Optional[str],
) -> Optional[list[Any]]:
    if not label_column:
        return None
    df = pd.read_csv(io.BytesIO(get_dataset_bytes(dataset_id)))
    actual = resolve_label_column(label_column, df.columns.tolist())
    return df[actual].tolist()


def suggested_grid_size(n_samples: int) -> int:
    return max(3, int(round(5 * np.sqrt(n_samples))))


def get_row_identifiers(dataset_id: str) -> list[str]:
    df = pd.read_csv(io.BytesIO(get_dataset_bytes(dataset_id)))
    for col in ("批次编号", "batch_id", "Batch", "id", "ID"):
        if col in df.columns:
            return df[col].astype(str).tolist()
    return [str(i + 1) for i in range(len(df))]


def get_row_record(dataset_id: str, row_index: int) -> dict[str, Any]:
    df = pd.read_csv(io.BytesIO(get_dataset_bytes(dataset_id)))
    if row_index < 0 or row_index >= len(df):
        raise ValueError(f"Row index {row_index} out of range")
    row = df.iloc[row_index]
    out: dict[str, Any] = {}
    for col, val in row.items():
        if pd.isna(val):
            out[str(col)] = None
        elif isinstance(val, (np.floating, float)):
            out[str(col)] = float(val)
        elif isinstance(val, (np.integer, int)):
            out[str(col)] = int(val)
        else:
            out[str(col)] = val if not hasattr(val, "item") else val.item()
    return out
