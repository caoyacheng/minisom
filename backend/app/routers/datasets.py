from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas import DatasetDetail, DatasetListResponse, DatasetPreview, DatasetSummary
from app.services import data_service

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.get("", response_model=DatasetListResponse)
def list_datasets() -> DatasetListResponse:
    rows = data_service.list_datasets()
    return DatasetListResponse(
        datasets=[DatasetSummary(**row) for row in rows],
    )


@router.post("/upload", response_model=DatasetPreview)
async def upload_dataset(file: UploadFile = File(...)) -> DatasetPreview:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    try:
        result = data_service.save_dataset(content, file.filename)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return DatasetPreview(**result)


@router.get("/{dataset_id}", response_model=DatasetDetail)
def get_dataset(dataset_id: str, limit: int = 10) -> DatasetDetail:
    try:
        meta = data_service.get_dataset_preview(dataset_id, limit=limit)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return DatasetDetail(**meta)


@router.get("/{dataset_id}/suggest-grid")
def suggest_grid(dataset_id: str) -> dict[str, int]:
    try:
        meta = data_service.get_dataset_meta(dataset_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    size = data_service.suggested_grid_size(meta["rows"])
    return {"grid_x": size, "grid_y": size, "formula": "5*sqrt(N)"}
