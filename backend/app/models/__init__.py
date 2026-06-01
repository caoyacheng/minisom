from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.som.adapter import SomAdapter

_REGISTRY: dict[str, SomAdapter] = {}


def _ensure_registry() -> None:
    if _REGISTRY:
        return
    from app.models.som.adapter import adapter as som_adapter

    _REGISTRY["som"] = som_adapter


def get_adapter(model_type: str = "som") -> SomAdapter:
    _ensure_registry()
    try:
        return _REGISTRY[model_type]
    except KeyError as exc:
        raise ValueError(f"Unsupported model_type: {model_type}") from exc


def supported_model_types() -> list[str]:
    _ensure_registry()
    return list(_REGISTRY.keys())
