from __future__ import annotations

import json
from functools import lru_cache
from typing import Any, Optional

from sqlalchemy import select

from app.schemas import ModelRecord
from app.storage.database import session_scope
from app.storage.db_models import DatasetRow, ModelRow, ModelVersionRow


def _version_to_record(model: ModelRow, version: ModelVersionRow) -> ModelRecord:
    return ModelRecord(
        id=model.id,
        name=model.name,
        model_type=model.model_type,
        created_at=version.created_at,
        dataset_id=model.dataset_id or "",
        hyperparameters=version.hyperparameters or {},
        metrics=version.metrics or {},
        feature_columns=version.feature_columns or [],
        label_column=version.label_column,
        normalize=version.normalize,
        is_active=model.is_active,
        version=version.version,
        storage_uri=version.weights_uri,
        content_sha256=version.content_sha256,
        size_bytes=version.size_bytes,
    )


class MetadataStore:
    def list_datasets(self) -> list[dict[str, Any]]:
        with session_scope() as session:
            rows = session.scalars(select(DatasetRow).order_by(DatasetRow.created_at.desc())).all()
            return [
                {
                    "id": row.id,
                    "name": row.name,
                    "rows": row.rows,
                    "columns": row.columns,
                    "numeric_columns": row.numeric_columns,
                    "storage_uri": row.storage_uri,
                    "size_bytes": row.size_bytes,
                    "created_at": row.created_at,
                }
                for row in rows
            ]

    def save_dataset(
        self,
        dataset_id: str,
        name: str,
        storage_uri: str,
        blob_key: str,
        content_sha256: str,
        size_bytes: int,
        rows: int,
        columns: list[str],
        numeric_columns: list[str],
    ) -> dict[str, Any]:
        with session_scope() as session:
            row = DatasetRow(
                id=dataset_id,
                name=name,
                storage_uri=storage_uri,
                blob_key=blob_key,
                content_sha256=content_sha256,
                size_bytes=size_bytes,
                rows=rows,
                columns=columns,
                numeric_columns=numeric_columns,
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return {
                "id": row.id,
                "name": row.name,
                "rows": row.rows,
                "columns": row.columns,
                "numeric_columns": row.numeric_columns,
            }

    def get_dataset(self, dataset_id: str) -> DatasetRow:
        with session_scope() as session:
            row = session.get(DatasetRow, dataset_id)
            if row is None:
                raise FileNotFoundError(f"Dataset {dataset_id} not found")
            return row

    def get_dataset_meta(self, dataset_id: str) -> dict[str, Any]:
        row = self.get_dataset(dataset_id)
        return {
            "id": row.id,
            "name": row.name,
            "rows": row.rows,
            "columns": row.columns,
            "numeric_columns": row.numeric_columns,
            "storage_uri": row.storage_uri,
            "blob_key": row.blob_key,
            "size_bytes": row.size_bytes,
        }

    def delete_dataset(self, dataset_id: str) -> None:
        with session_scope() as session:
            row = session.get(DatasetRow, dataset_id)
            if row is None:
                return
            session.delete(row)
            session.commit()

    def list_models(self) -> tuple[list[ModelRecord], Optional[str]]:
        with session_scope() as session:
            models = session.scalars(select(ModelRow).order_by(ModelRow.created_at.desc())).all()
            records: list[ModelRecord] = []
            active_id: Optional[str] = None
            for model in models:
                version = self._current_version(session, model)
                if version is None:
                    continue
                records.append(_version_to_record(model, version))
                if model.is_active:
                    active_id = model.id
            return records, active_id

    def get_model(self, model_id: str) -> ModelRecord:
        with session_scope() as session:
            model = session.get(ModelRow, model_id)
            if model is None:
                raise FileNotFoundError(f"Model {model_id} not found")
            version = self._current_version(session, model)
            if version is None:
                raise FileNotFoundError(f"Model {model_id} has no versions")
            return _version_to_record(model, version)

    def get_model_weights_key(self, model_id: str) -> str:
        with session_scope() as session:
            model = session.get(ModelRow, model_id)
            if model is None:
                raise FileNotFoundError(f"Model {model_id} not found")
            version = self._current_version(session, model)
            if version is None:
                raise FileNotFoundError(f"Model {model_id} has no versions")
            return version.weights_key

    def save_model_version(
        self,
        model_id: str,
        name: str,
        model_type: str,
        dataset_id: str,
        weights_uri: str,
        weights_key: str,
        manifest_uri: str | None,
        manifest_key: str | None,
        content_sha256: str,
        size_bytes: int,
        artifact_format: str,
        hyperparameters: dict[str, Any],
        metrics: dict[str, Optional[float]],
        feature_columns: list[str],
        label_column: Optional[str],
        normalize: bool,
    ) -> ModelRecord:
        with session_scope() as session:
            model = ModelRow(
                id=model_id,
                name=name,
                model_type=model_type,
                dataset_id=dataset_id or None,
                is_active=False,
            )
            version = ModelVersionRow(
                model_id=model_id,
                version=1,
                weights_uri=weights_uri,
                weights_key=weights_key,
                manifest_uri=manifest_uri,
                manifest_key=manifest_key,
                content_sha256=content_sha256,
                size_bytes=size_bytes,
                format=artifact_format,
                hyperparameters=hyperparameters,
                metrics=metrics,
                feature_columns=feature_columns,
                label_column=label_column,
                normalize=normalize,
            )
            session.add(model)
            session.add(version)
            session.flush()
            model.current_version_id = version.id
            session.commit()
            session.refresh(model)
            session.refresh(version)
            return _version_to_record(model, version)

    def activate_model(self, model_id: str) -> ModelRecord:
        with session_scope() as session:
            models = session.scalars(select(ModelRow)).all()
            found: ModelRow | None = None
            for model in models:
                if model.id == model_id:
                    model.is_active = True
                    found = model
                else:
                    model.is_active = False
            if found is None:
                raise FileNotFoundError(f"Model {model_id} not found")
            session.commit()
            session.refresh(found)
            version = self._current_version(session, found)
            if version is None:
                raise FileNotFoundError(f"Model {model_id} has no versions")
            return _version_to_record(found, version)

    def delete_model(self, model_id: str) -> list[str]:
        """删除模型元数据，返回需删除的 blob keys。"""
        with session_scope() as session:
            model = session.get(ModelRow, model_id)
            if model is None:
                return []
            keys = [v.weights_key for v in model.versions]
            for v in model.versions:
                if v.manifest_key:
                    keys.append(v.manifest_key)
                keys.append(v.weights_key.replace("weights.pkl", "training_config.json"))
            session.delete(model)
            session.commit()
            return keys

    def get_active_model_id(self) -> Optional[str]:
        with session_scope() as session:
            row = session.scalar(select(ModelRow).where(ModelRow.is_active.is_(True)))
            return row.id if row else None

    def count_models(self) -> int:
        with session_scope() as session:
            return len(session.scalars(select(ModelRow)).all())

    @staticmethod
    def _current_version(session, model: ModelRow) -> ModelVersionRow | None:
        if model.current_version_id:
            version = session.get(ModelVersionRow, model.current_version_id)
            if version is not None:
                return version
        if model.versions:
            return model.versions[-1]
        return None


@lru_cache
def get_metadata_store() -> MetadataStore:
    return MetadataStore()
