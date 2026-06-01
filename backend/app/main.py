from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import datasets, evaluation, inference, models, training
from app.schemas import HealthResponse
from app.services import model_registry
from app.storage.bootstrap import bootstrap_storage

app = FastAPI(
    title="工业模型工作台 API",
    description="Train, test, and deploy Self-Organizing Maps",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5180", "http://127.0.0.1:5180"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets.router)
app.include_router(training.router)
app.include_router(evaluation.router)
app.include_router(models.router)
app.include_router(inference.router)

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@app.on_event("startup")
def startup() -> None:
    bootstrap_storage()


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    settings = get_settings()
    db_scheme = settings.database_url.split(":", 1)[0]
    return HealthResponse(
        status="ok",
        active_model_id=model_registry.get_active_model_id(),
        storage_backend=settings.storage_backend,
        database_url_scheme=db_scheme,
    )


if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/")
    def serve_index() -> FileResponse:
        return FileResponse(FRONTEND_DIST / "index.html")
