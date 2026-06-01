from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_STORAGE_DIR = BACKEND_ROOT / "storage"

# 上传 CSV 大小上限（字节），默认 50 MB
DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- 数据库 & 存储 ---
    database_url: str = f"sqlite:///{DEFAULT_STORAGE_DIR / 'meta.db'}"
    storage_backend: Literal["local", "minio"] = "local"
    blob_root: Path = DEFAULT_STORAGE_DIR / "blobs"

    minio_endpoint: str = "127.0.0.1:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "industrial-models"
    minio_secure: bool = False

    legacy_storage_dir: Path = DEFAULT_STORAGE_DIR

    # --- 安全 / 网络 ---
    # 逗号分隔的允许跨域来源；生产环境务必通过环境变量覆盖。
    # NoDecode 让 pydantic-settings 不会按 JSON 解析，留给下面的 validator。
    allowed_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5180",
        "http://127.0.0.1:5180",
    ]
    # CSV / Pickle 上传字节上限（请求体会包含 multipart 头，故略大于文件本身）
    max_upload_bytes: int = DEFAULT_MAX_UPLOAD_BYTES

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _split_origins(cls, v):
        """支持 `ALLOWED_ORIGINS="https://a.com,https://b.com"` 字符串形式。"""
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @field_validator("max_upload_bytes")
    @classmethod
    def _positive_size(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("max_upload_bytes must be positive")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
