from contextlib import asynccontextmanager
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

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """应用生命周期：启动时初始化存储 + 导入历史数据。"""
    bootstrap_storage()
    yield


app = FastAPI(
    title="工业模型工作台 API",
    description="Train, test, and deploy Self-Organizing Maps",
    version="1.0.0",
    lifespan=lifespan,
)

_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets.router)
app.include_router(training.router)
app.include_router(evaluation.router)
app.include_router(models.router)
app.include_router(inference.router)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    db_scheme = _settings.database_url.split(":", 1)[0]
    return HealthResponse(
        status="ok",
        active_model_id=model_registry.get_active_model_id(),
        storage_backend=_settings.storage_backend,
        database_url_scheme=db_scheme,
    )


if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/")
    def serve_index() -> FileResponse:
        return FileResponse(FRONTEND_DIST / "index.html")
