import io

import numpy as np
import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models import get_adapter
from app.schemas import PredictRequest, PredictResult
from app.services import model_registry
from app.services.column_aliases import resolve_columns

router = APIRouter(prefix="/api/inference", tags=["inference"])


def _resolve_model_id(model_id: str | None) -> str:
    if model_id:
        return model_id
    active = model_registry.get_active_model_id()
    if not active:
        raise HTTPException(
            status_code=400,
            detail="No active model. Activate a model or pass model_id.",
        )
    return active


@router.post("/predict", response_model=PredictResult)
def predict(request: PredictRequest) -> PredictResult:
    model_id = _resolve_model_id(request.model_id)
    try:
        model = model_registry.get_model(model_id)
        adapter = get_adapter(model.model_type)
        artifact = adapter.load(model_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    samples = np.array(request.samples, dtype=float)
    if samples.ndim == 1:
        samples = samples.reshape(1, -1)
    expected = adapter.input_length(artifact)
    if samples.shape[1] != expected:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Expected {expected} features, got {samples.shape[1]}"
            ),
        )

    result = adapter.predict(artifact, samples)
    return PredictResult(
        model_id=model_id,
        winners=[(w[0], w[1]) for w in result["winners"]],
        quantized=result["quantized"],
    )


@router.post("/predict-file")
async def predict_file(
    file: UploadFile = File(...),
    model_id: str | None = None,
) -> dict:
    resolved_id = _resolve_model_id(model_id)
    try:
        model = model_registry.get_model(resolved_id)
        adapter = get_adapter(model.model_type)
        artifact = adapter.load(resolved_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))
    try:
        actual_columns = resolve_columns(
            model.feature_columns, df.columns.tolist()
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    data = df[actual_columns].astype(float).values
    if model.normalize:
        mean = data.mean(axis=0)
        std = data.std(axis=0)
        std[std == 0] = 1.0
        data = (data - mean) / std

    result = adapter.predict(artifact, data)
    df["bmu_x"] = [w[0] for w in result["winners"]]
    df["bmu_y"] = [w[1] for w in result["winners"]]
    for i in range(adapter.input_length(artifact)):
        df[f"quantized_{i}"] = [row[i] for row in result["quantized"]]

    csv_bytes = df.to_csv(index=False).encode("utf-8")
    return {
        "model_id": resolved_id,
        "rows": len(df),
        "csv": csv_bytes.decode("utf-8"),
    }
