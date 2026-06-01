import threading

from fastapi import APIRouter, HTTPException

from app.models import get_adapter
from app.schemas import (
    TrainingConfig,
    TrainingJobStatus,
    Visualizations,
)
from app.services import data_service, job_store

router = APIRouter(prefix="/api/training", tags=["training"])


def _run_training(job_id: str, config: TrainingConfig) -> None:
    store = job_store.job_store
    adapter = get_adapter(config.model_type)
    try:
        store.update(
            job_id,
            status="running",
            message="正在加载数据...",
            progress=0.0,
        )
        data, _ = adapter.load_training_data(config)
        total = config.num_iterations

        def on_progress(current: int, total_iters: int, qe: float) -> None:
            store.update(
                job_id,
                progress=round(current / total_iters * 100, 2),
                metrics={
                    "iteration": current,
                    "total_iterations": total_iters,
                    "quantization_error": qe,
                },
                message=f"训练进度 {current}/{total_iters}",
            )

        store.update(job_id, message="正在训练 SOM...")
        artifact = adapter.train(config, data, progress_callback=on_progress)

        metrics = adapter.evaluate(artifact, data)
        record = adapter.save(
            artifact,
            config,
            {
                "quantization_error": metrics["quantization_error"],
                "topographic_error": metrics["topographic_error"],
            },
        )
        viz = adapter.visualizations(artifact, data)
        store.update(
            job_id,
            status="completed",
            progress=100.0,
            message="训练完成",
            model_id=record.id,
            visualizations=viz,
            metrics={
                "iteration": total,
                "total_iterations": total,
                "quantization_error": metrics["quantization_error"],
            },
        )
    except Exception as exc:
        store.update(
            job_id,
            status="failed",
            error=str(exc),
            message="训练失败",
        )


@router.post("/start", response_model=TrainingJobStatus)
def start_training(config: TrainingConfig) -> TrainingJobStatus:
    try:
        get_adapter(config.model_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        data_service.get_dataset_meta(config.dataset_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if not config.feature_columns:
        raise HTTPException(status_code=400, detail="feature_columns required")

    job_id = job_store.job_store.create()
    thread = threading.Thread(
        target=_run_training, args=(job_id, config), daemon=True
    )
    thread.start()

    job = job_store.job_store.get(job_id)
    return TrainingJobStatus(
        job_id=job.job_id,
        status=job.status,
        progress=job.progress,
        message=job.message,
    )


@router.get("/jobs/{job_id}", response_model=TrainingJobStatus)
def get_job_status(job_id: str) -> TrainingJobStatus:
    try:
        job = job_store.job_store.get(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return TrainingJobStatus(
        job_id=job.job_id,
        status=job.status,
        progress=job.progress,
        message=job.message,
        metrics=job.metrics,
        model_id=job.model_id,
        error=job.error,
    )


@router.get("/jobs/{job_id}/visualizations", response_model=Visualizations)
def get_job_visualizations(job_id: str) -> Visualizations:
    try:
        job = job_store.job_store.get(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if job.status != "completed" or not job.visualizations:
        raise HTTPException(status_code=400, detail="Visualizations not ready")

    return Visualizations(**job.visualizations)
