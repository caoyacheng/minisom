from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.schemas import ModelListResponse, ModelRecord
from app.services import model_registry

router = APIRouter(prefix="/api/models", tags=["models"])


@router.get("", response_model=ModelListResponse)
def list_models() -> ModelListResponse:
    models, active_id = model_registry.list_models()
    return ModelListResponse(models=models, active_model_id=active_id)


@router.get("/{model_id}", response_model=ModelRecord)
def get_model(model_id: str) -> ModelRecord:
    try:
        return model_registry.get_model(model_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{model_id}/download")
def download_model(model_id: str) -> Response:
    try:
        raw = model_registry.get_model_weights_bytes(model_id)
        meta = model_registry.get_model(model_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(
        content=raw,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{model_id}.pkl"',
            "X-Content-SHA256": meta.content_sha256 or "",
        },
    )


@router.post("/{model_id}/activate", response_model=ModelRecord)
def activate_model(model_id: str) -> ModelRecord:
    try:
        return model_registry.activate_model(model_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{model_id}")
def delete_model(model_id: str) -> dict[str, str]:
    try:
        model_registry.delete_model(model_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "deleted", "model_id": model_id}
