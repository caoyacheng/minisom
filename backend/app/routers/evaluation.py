import uuid

from fastapi import APIRouter, HTTPException

from app.models import get_adapter
from app.schemas import AnomalyRecord, EvaluationRequest, EvaluationResult, SampleSummary
from app.services import data_service, evaluation_store, model_registry

router = APIRouter(prefix="/api/evaluation", tags=["evaluation"])


@router.post("/run", response_model=EvaluationResult)
def run_evaluation(request: EvaluationRequest) -> EvaluationResult:
    try:
        model = model_registry.get_model(request.model_id)
        adapter = get_adapter(model.model_type)
        artifact = adapter.load(request.model_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    feature_columns = request.feature_columns or model.feature_columns
    normalize = request.normalize if request.feature_columns else model.normalize
    label_column = request.label_column or model.label_column

    try:
        data = data_service.load_feature_matrix(
            request.dataset_id,
            feature_columns,
            normalize=normalize,
        )
        labels = data_service.load_labels(request.dataset_id, label_column)
        row_ids = data_service.get_row_identifiers(request.dataset_id)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    expected = adapter.input_length(artifact)
    if data.shape[1] != expected:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Feature dimension mismatch: model expects {expected}, "
                f"got {data.shape[1]}"
            ),
        )

    metrics = adapter.evaluate(artifact, data, labels)
    anomaly_info = adapter.detect_anomalies(artifact, data, row_ids, labels)
    anomalies_payload = []
    for a in anomaly_info["anomalies"]:
        row_data = data_service.get_row_record(request.dataset_id, a["row_index"])
        anomalies_payload.append({**a, "row_data": row_data})
    run_id = str(uuid.uuid4())
    result = EvaluationResult(
        run_id=run_id,
        model_id=request.model_id,
        dataset_id=request.dataset_id,
        quantization_error=metrics["quantization_error"],
        topographic_error=metrics["topographic_error"],
        winners=[(w[0], w[1]) for w in metrics["winners"]],
        labels_map=metrics["labels_map"],
        anomalies=[AnomalyRecord(**a) for a in anomalies_payload],
        samples=[SampleSummary(**s) for s in anomaly_info["samples"]],
        anomaly_count=anomaly_info["anomaly_count"],
        qe_threshold=anomaly_info["qe_threshold"],
        grid_x=anomaly_info["grid_x"],
        grid_y=anomaly_info["grid_y"],
        anomaly_map=anomaly_info["anomaly_map"],
        sample_map=anomaly_info["sample_map"],
        reason_stats=anomaly_info["reason_stats"],
    )
    evaluation_store.save_evaluation_run(result)
    return result


@router.get("/{run_id}/win-map", response_model=EvaluationResult)
def get_win_map(run_id: str) -> EvaluationResult:
    try:
        return evaluation_store.get_evaluation_run(run_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
