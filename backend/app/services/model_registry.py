from __future__ import annotations

import logging
from typing import Any, Optional

from app.models import get_adapter
from app.schemas import ModelRecord
from app.storage.blob_store import get_blob_store
from app.storage.metadata_store import get_metadata_store

logger = logging.getLogger(__name__)


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
    """删除模型：先取 blob key 列表，逐个删 blob，最后才删元数据。

    顺序选择的原因：若先删元数据再删 blob，blob 删失败时会留下无法索引的
    孤儿文件。先删 blob 可以让元数据行始终指向有效资源；blob 删除异常
    仅记录警告，不阻塞——以免一个临时网络错误就拒绝用户的删除请求。
    """
    meta = get_metadata_store()
    blob = get_blob_store()

    # 1. 拿到所有需要清理的 blob key。model 不存在则直接成功返回。
    try:
        keys = meta.get_model_blob_keys(model_id)
    except FileNotFoundError:
        return

    # 2. 先逐个删 blob，失败仅记录警告。
    for key in keys:
        try:
            blob.delete(key)
        except Exception:
            logger.warning(
                "Failed to delete blob for model %s: key=%s",
                model_id,
                key,
                exc_info=True,
            )

    # 3. 最后才删元数据行（不可恢复，需在所有 blob 已尝试后进行）。
    meta.delete_model(model_id)


def get_active_model_id() -> Optional[str]:
    return get_metadata_store().get_active_model_id()
