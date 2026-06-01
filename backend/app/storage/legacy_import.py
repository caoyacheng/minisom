"""从旧版 registry.json / 本地 storage 目录导入元数据与 blob。"""

from __future__ import annotations

import json
import pickle
from pathlib import Path

from sqlalchemy import select

from app.config import get_settings
from app.storage.blob_store import get_blob_store, sha256_hex
from app.storage.database import session_scope
from app.storage.db_models import DatasetRow, ModelRow, ModelVersionRow
from app.storage.metadata_store import get_metadata_store


def import_legacy_storage() -> None:
    settings = get_settings()
    meta = get_metadata_store()
    if meta.count_models() > 0:
        return

    blob = get_blob_store()
    legacy = settings.legacy_storage_dir
    registry_path = legacy / "registry.json"

    _import_legacy_datasets(legacy / "datasets", blob, meta)
    if registry_path.exists():
        _import_legacy_registry(registry_path, legacy / "models", blob, meta)


def _import_legacy_datasets(datasets_dir: Path, blob, meta) -> None:
    if not datasets_dir.exists():
        return
    with session_scope() as session:
        existing = {row.id for row in session.scalars(select(DatasetRow)).all()}

    for meta_path in datasets_dir.glob("*.meta.json"):
        dataset_id = meta_path.name.replace(".meta.json", "")
        if dataset_id in existing:
            continue
        csv_path = datasets_dir / f"{dataset_id}.csv"
        if not csv_path.exists():
            continue
        raw = csv_path.read_bytes()
        blob_key = f"datasets/{dataset_id}/data.csv"
        if not blob.exists(blob_key):
            uri = blob.put(blob_key, raw, content_type="text/csv")
        else:
            uri = f"imported://{blob_key}"
        info = json.loads(meta_path.read_text())
        meta.save_dataset(
            dataset_id=dataset_id,
            name=info.get("name", dataset_id),
            storage_uri=uri,
            blob_key=blob_key,
            content_sha256=sha256_hex(raw),
            size_bytes=len(raw),
            rows=int(info.get("rows", 0)),
            columns=info.get("columns", []),
            numeric_columns=info.get("numeric_columns", []),
        )


def _import_legacy_registry(registry_path: Path, models_dir: Path, blob, meta) -> None:
    reg = json.loads(registry_path.read_text())
    for item in reg.get("models", []):
        model_id = item["id"]
        with session_scope() as session:
            if session.get(ModelRow, model_id) is not None:
                continue

        pkl_path = models_dir / f"{model_id}.pkl"
        if not pkl_path.exists():
            continue

        raw = pkl_path.read_bytes()
        blob_key = f"models/{model_id}/v1/weights.pkl"
        if not blob.exists(blob_key):
            weights_uri = blob.put(blob_key, raw, content_type="application/octet-stream")
        else:
            weights_uri = f"imported://{blob_key}"

        manifest = {
            "model_id": model_id,
            "model_type": "som",
            "format": "pickle",
            "feature_columns": item.get("feature_columns", []),
        }
        manifest_key = f"models/{model_id}/v1/manifest.json"
        manifest_bytes = json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")
        manifest_uri = blob.put(manifest_key, manifest_bytes, content_type="application/json")

        record = meta.save_model_version(
            model_id=model_id,
            name=item.get("name", model_id),
            model_type="som",
            dataset_id=item.get("dataset_id", ""),
            weights_uri=weights_uri,
            weights_key=blob_key,
            manifest_uri=manifest_uri,
            manifest_key=manifest_key,
            content_sha256=sha256_hex(raw),
            size_bytes=len(raw),
            artifact_format="pickle",
            hyperparameters=item.get("hyperparameters", {}),
            metrics=item.get("metrics", {}),
            feature_columns=item.get("feature_columns", []),
            label_column=item.get("label_column"),
            normalize=bool(item.get("normalize", True)),
        )

        if item.get("is_active"):
            meta.activate_model(record.id)

        # 验证 pickle 可读
        try:
            pickle.loads(raw)
        except Exception:
            pass
