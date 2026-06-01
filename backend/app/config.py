from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_STORAGE_DIR = BACKEND_ROOT / "storage"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = f"sqlite:///{DEFAULT_STORAGE_DIR / 'meta.db'}"
    storage_backend: Literal["local", "minio"] = "local"
    blob_root: Path = DEFAULT_STORAGE_DIR / "blobs"

    minio_endpoint: str = "127.0.0.1:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "industrial-models"
    minio_secure: bool = False

    legacy_storage_dir: Path = DEFAULT_STORAGE_DIR


@lru_cache
def get_settings() -> Settings:
    return Settings()
