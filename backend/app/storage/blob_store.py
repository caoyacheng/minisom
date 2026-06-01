from __future__ import annotations

import hashlib
import io
from abc import ABC, abstractmethod
from functools import lru_cache
from pathlib import Path
from typing import BinaryIO

from app.config import get_settings


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class BlobStore(ABC):
    @abstractmethod
    def put(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        """写入 blob，返回 storage_uri。"""

    @abstractmethod
    def get(self, key: str) -> bytes:
        ...

    @abstractmethod
    def delete(self, key: str) -> None:
        ...

    @abstractmethod
    def exists(self, key: str) -> bool:
        ...

    def open_stream(self, key: str) -> BinaryIO:
        return io.BytesIO(self.get(key))


class LocalBlobStore(BlobStore):
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        safe = key.lstrip("/").replace("..", "")
        return self.root / safe

    def put(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return f"file://{path}"

    def get(self, key: str) -> bytes:
        path = self._path(key)
        if not path.exists():
            raise FileNotFoundError(f"Blob not found: {key}")
        return path.read_bytes()

    def delete(self, key: str) -> None:
        path = self._path(key)
        if path.exists():
            path.unlink()

    def exists(self, key: str) -> bool:
        return self._path(key).exists()


class MinioBlobStore(BlobStore):
    def __init__(
        self,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        secure: bool = False,
    ) -> None:
        from minio import Minio
        from minio.error import S3Error

        self._S3Error = S3Error
        self.client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure,
        )
        self.bucket = bucket
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        if not self.client.bucket_exists(self.bucket):
            self.client.make_bucket(self.bucket)

    def put(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        from minio import Minio

        assert isinstance(self.client, Minio)
        safe = key.lstrip("/")
        self.client.put_object(
            self.bucket,
            safe,
            io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
        return f"s3://{self.bucket}/{safe}"

    def get(self, key: str) -> bytes:
        safe = key.lstrip("/")
        try:
            response = self.client.get_object(self.bucket, safe)
        except self._S3Error as exc:
            raise FileNotFoundError(f"Blob not found: {key}") from exc
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    def delete(self, key: str) -> None:
        safe = key.lstrip("/")
        try:
            self.client.remove_object(self.bucket, safe)
        except self._S3Error:
            pass

    def exists(self, key: str) -> bool:
        safe = key.lstrip("/")
        try:
            self.client.stat_object(self.bucket, safe)
            return True
        except self._S3Error:
            return False


@lru_cache
def get_blob_store() -> BlobStore:
    settings = get_settings()
    if settings.storage_backend == "minio":
        return MinioBlobStore(
            endpoint=settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            bucket=settings.minio_bucket,
            secure=settings.minio_secure,
        )
    return LocalBlobStore(settings.blob_root)
