from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from app.models.som.schemas import SomTrainingConfig as TrainingConfig
from app.models.som.schemas import SomVisualizations as Visualizations

__all__ = [
    "TrainingConfig",
    "Visualizations",
]


class DatasetPreview(BaseModel):
    id: str
    name: str
    rows: int
    columns: list[str]
    preview: list[dict[str, Any]]
    numeric_columns: list[str]


class DatasetDetail(DatasetPreview):
    label_column: Optional[str] = None
    feature_columns: Optional[list[str]] = None


class JobMetrics(BaseModel):
    iteration: int = 0
    total_iterations: int = 0
    quantization_error: Optional[float] = None


class TrainingJobStatus(BaseModel):
    job_id: str
    status: Literal["pending", "running", "completed", "failed"]
    progress: float = 0.0
    message: str = ""
    metrics: JobMetrics = Field(default_factory=JobMetrics)
    model_id: Optional[str] = None
    error: Optional[str] = None


class EvaluationRequest(BaseModel):
    model_id: str
    dataset_id: str
    feature_columns: Optional[list[str]] = None
    label_column: Optional[str] = None
    normalize: bool = True


class AnomalyRecord(BaseModel):
    row_index: int
    row_id: str
    quantization_error: float
    bmu_x: int
    bmu_y: int
    label: Optional[str] = None
    reasons: list[str]
    row_data: dict[str, Any] = Field(default_factory=dict)


class SampleSummary(BaseModel):
    row_index: int
    row_id: str
    quantization_error: float
    bmu_x: int
    bmu_y: int
    is_anomaly: bool
    label: Optional[str] = None


class EvaluationResult(BaseModel):
    run_id: str
    model_id: str
    dataset_id: str
    quantization_error: float
    topographic_error: float
    winners: list[tuple[int, int]]
    labels_map: Optional[dict[str, dict[str, int]]] = None
    anomalies: list[AnomalyRecord] = Field(default_factory=list)
    samples: list[SampleSummary] = Field(default_factory=list)
    anomaly_count: int = 0
    qe_threshold: Optional[float] = None
    grid_x: int = 0
    grid_y: int = 0
    anomaly_map: list[list[int]] = Field(default_factory=list)
    sample_map: list[list[int]] = Field(default_factory=list)
    reason_stats: dict[str, int] = Field(default_factory=dict)


class ModelRecord(BaseModel):
    id: str
    name: str
    model_type: str = "som"
    created_at: datetime
    dataset_id: str
    hyperparameters: dict[str, Any]
    metrics: dict[str, Optional[float]]
    feature_columns: list[str]
    label_column: Optional[str] = None
    normalize: bool = True
    is_active: bool = False
    version: int = 1
    storage_uri: Optional[str] = None
    content_sha256: Optional[str] = None
    size_bytes: Optional[int] = None


class DatasetSummary(BaseModel):
    id: str
    name: str
    rows: int
    columns: list[str]
    numeric_columns: list[str]
    size_bytes: int = 0
    created_at: datetime


class DatasetListResponse(BaseModel):
    datasets: list[DatasetSummary]


class ModelListResponse(BaseModel):
    models: list[ModelRecord]
    active_model_id: Optional[str] = None


class PredictRequest(BaseModel):
    model_id: Optional[str] = None
    samples: list[list[float]]


class PredictResult(BaseModel):
    model_id: str
    winners: list[tuple[int, int]]
    quantized: list[list[float]]


class HealthResponse(BaseModel):
    status: str
    active_model_id: Optional[str] = None
    storage_backend: str = "local"
    database_url_scheme: str = "sqlite"
