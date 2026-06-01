from app.config import get_settings
from app.storage.database import init_database
from app.storage.legacy_import import import_legacy_storage


def bootstrap_storage() -> None:
    settings = get_settings()
    settings.legacy_storage_dir.mkdir(parents=True, exist_ok=True)
    settings.blob_root.mkdir(parents=True, exist_ok=True)
    init_database()
    import_legacy_storage()
