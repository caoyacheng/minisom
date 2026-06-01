"""MCP tools exposing Som Web Backend to T-Claw / OpenClaw agents."""

from __future__ import annotations

import asyncio
from typing import Any, Literal, Optional

from mcp.server.fastmcp import FastMCP

from som_mcp.api_client import SomApiClient

mcp = FastMCP(
    "som-workbench",
    instructions=(
        "Som 算法工作台 MCP：通过本地 FastAPI 后端完成数据集上传、SOM 模型训练、"
        "超参调整、异常评估、推理与模型部署（activate）。"
        "训练为异步任务，请用 som_wait_training 等待完成。"
        "推理未指定 model_id 时使用当前已部署（active）模型。"
    ),
)

_client: Optional[SomApiClient] = None


def _get_client() -> SomApiClient:
    global _client
    if _client is None:
        _client = SomApiClient()
    return _client


def _compact_model(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": record.get("id"),
        "name": record.get("name"),
        "created_at": record.get("created_at"),
        "dataset_id": record.get("dataset_id"),
        "feature_columns": record.get("feature_columns"),
        "label_column": record.get("label_column"),
        "normalize": record.get("normalize"),
        "is_active": record.get("is_active"),
        "metrics": record.get("metrics"),
        "hyperparameters": {
            k: record.get("hyperparameters", {}).get(k)
            for k in (
                "grid_x",
                "grid_y",
                "sigma",
                "learning_rate",
                "num_iterations",
                "topology",
                "neighborhood_function",
                "training_mode",
            )
            if record.get("hyperparameters")
        },
    }


def _compact_anomaly(a: dict[str, Any]) -> dict[str, Any]:
    return {
        "row_index": a.get("row_index"),
        "row_id": a.get("row_id"),
        "quantization_error": a.get("quantization_error"),
        "bmu_x": a.get("bmu_x"),
        "bmu_y": a.get("bmu_y"),
        "label": a.get("label"),
        "reasons": a.get("reasons"),
    }


def _compact_evaluation(result: dict[str, Any], top_n: int = 20) -> dict[str, Any]:
    anomalies = result.get("anomalies") or []
    return {
        "run_id": result.get("run_id"),
        "model_id": result.get("model_id"),
        "dataset_id": result.get("dataset_id"),
        "quantization_error": result.get("quantization_error"),
        "topographic_error": result.get("topographic_error"),
        "anomaly_count": result.get("anomaly_count"),
        "qe_threshold": result.get("qe_threshold"),
        "grid_x": result.get("grid_x"),
        "grid_y": result.get("grid_y"),
        "reason_stats": result.get("reason_stats"),
        "top_anomalies": [_compact_anomaly(a) for a in anomalies[:top_n]],
        "top_anomalies_truncated": len(anomalies) > top_n,
    }


# --- Health & datasets ---


@mcp.tool()
def som_health() -> dict[str, Any]:
    """检查 Som 后端是否在线，并返回当前已部署（active）模型 ID。"""
    client = _get_client()
    health = client.health()
    return {"api_base": client.base_url, **health}


@mcp.tool()
def som_upload_dataset(file_path: str) -> dict[str, Any]:
    """上传 CSV 训练/测试数据集。返回 dataset_id、列名与预览。"""
    return _get_client().upload_dataset(file_path)


@mcp.tool()
def som_get_dataset(dataset_id: str, limit: int = 10) -> dict[str, Any]:
    """获取数据集元信息与前几行预览。"""
    return _get_client().get_dataset(dataset_id, limit=limit)


@mcp.tool()
def som_suggest_grid(dataset_id: str) -> dict[str, Any]:
    """根据样本量建议 SOM 网格大小（公式 5*sqrt(N)）。"""
    return _get_client().suggest_grid(dataset_id)


# --- Training ---


@mcp.tool()
def som_start_training(
    dataset_id: str,
    feature_columns: list[str],
    model_name: str = "som-model",
    label_column: Optional[str] = None,
    normalize: bool = True,
    grid_x: int = 8,
    grid_y: int = 8,
    sigma: float = 1.0,
    learning_rate: float = 0.5,
    num_iterations: int = 100,
    topology: Literal["rectangular", "hexagonal"] = "rectangular",
    neighborhood_function: Literal[
        "gaussian", "mexican_hat", "bubble", "triangle"
    ] = "gaussian",
    activation_distance: Literal[
        "euclidean", "cosine", "manhattan", "chebyshev"
    ] = "euclidean",
    training_mode: Literal[
        "online", "batch_offline", "batch_offline_fast"
    ] = "online",
    weight_init: Literal["random", "pca"] = "pca",
    random_order: bool = False,
    use_epochs: bool = False,
) -> dict[str, Any]:
    """启动 SOM 异步训练，返回 job_id。需配合 som_wait_training 等待完成。"""
    config: dict[str, Any] = {
        "dataset_id": dataset_id,
        "model_name": model_name,
        "feature_columns": feature_columns,
        "label_column": label_column,
        "normalize": normalize,
        "grid_x": grid_x,
        "grid_y": grid_y,
        "sigma": sigma,
        "learning_rate": learning_rate,
        "num_iterations": num_iterations,
        "topology": topology,
        "neighborhood_function": neighborhood_function,
        "activation_distance": activation_distance,
        "training_mode": training_mode,
        "weight_init": weight_init,
        "random_order": random_order,
        "use_epochs": use_epochs,
    }
    return _get_client().start_training(config)


@mcp.tool()
def som_get_training_job(job_id: str) -> dict[str, Any]:
    """查询训练任务状态、进度与量化误差。"""
    return _get_client().get_training_job(job_id)


@mcp.tool()
async def som_wait_training(
    job_id: str,
    timeout_seconds: int = 3600,
    poll_interval_seconds: float = 2.0,
) -> dict[str, Any]:
    """轮询训练任务直到完成或失败。成功时返回 model_id 与最终指标。"""
    client = _get_client()
    elapsed = 0.0
    while elapsed < timeout_seconds:
        job = client.get_training_job(job_id)
        status = job.get("status")
        if status == "completed":
            return job
        if status == "failed":
            raise RuntimeError(job.get("error") or job.get("message") or "Training failed")
        await asyncio.sleep(poll_interval_seconds)
        elapsed += poll_interval_seconds
    raise TimeoutError(f"Training job {job_id} did not finish within {timeout_seconds}s")


@mcp.tool()
def som_get_training_visualizations(job_id: str) -> dict[str, Any]:
    """获取已完成训练任务的 U-matrix 与激活响应（用于调参参考）。"""
    return _get_client().get_training_visualizations(job_id)


# --- Models / deploy ---


@mcp.tool()
def som_list_models() -> dict[str, Any]:
    """列出所有已训练模型及当前 active 模型 ID。"""
    data = _get_client().list_models()
    return {
        "active_model_id": data.get("active_model_id"),
        "models": [_compact_model(m) for m in data.get("models", [])],
    }


@mcp.tool()
def som_get_model(model_id: str) -> dict[str, Any]:
    """查看单个模型的超参、特征列与评估指标。"""
    return _compact_model(_get_client().get_model(model_id))


@mcp.tool()
def som_activate_model(model_id: str) -> dict[str, Any]:
    """部署模型：设为 active，后续推理默认使用此模型。"""
    return _compact_model(_get_client().activate_model(model_id))


@mcp.tool()
def som_delete_model(model_id: str) -> dict[str, Any]:
    """删除指定模型文件与注册信息。"""
    return _get_client().delete_model(model_id)


# --- Evaluation ---


@mcp.tool()
def som_run_evaluation(
    model_id: str,
    dataset_id: str,
    feature_columns: Optional[list[str]] = None,
    label_column: Optional[str] = None,
    normalize: bool = True,
    top_n: int = 20,
) -> dict[str, Any]:
    """对测试集运行评估与异常检测，返回摘要及前 top_n 条异常。"""
    payload: dict[str, Any] = {
        "model_id": model_id,
        "dataset_id": dataset_id,
        "normalize": normalize,
    }
    if feature_columns is not None:
        payload["feature_columns"] = feature_columns
    if label_column is not None:
        payload["label_column"] = label_column
    result = _get_client().run_evaluation(payload)
    return _compact_evaluation(result, top_n=top_n)


# --- Inference ---


@mcp.tool()
def som_predict(
    samples: list[list[float]],
    model_id: Optional[str] = None,
) -> dict[str, Any]:
    """对特征向量批量推理，返回 BMU 坐标与量化向量。model_id 省略时用 active 模型。"""
    return _get_client().predict(samples, model_id=model_id)


@mcp.tool()
def som_predict_file(
    file_path: str,
    model_id: Optional[str] = None,
    max_csv_chars: int = 8000,
) -> dict[str, Any]:
    """对 CSV 文件批量推理，返回带 bmu_x/bmu_y 的结果。csv 过长时截断展示。"""
    result = _get_client().predict_file(file_path, model_id=model_id)
    csv_text = result.get("csv") or ""
    truncated = len(csv_text) > max_csv_chars
    if truncated:
        csv_text = csv_text[:max_csv_chars] + "\n... (truncated)"
    return {
        "model_id": result.get("model_id"),
        "rows": result.get("rows"),
        "csv": csv_text,
        "csv_truncated": truncated,
    }


# --- Composite workflows ---


@mcp.tool()
async def som_train_and_deploy(
    file_path: str,
    feature_columns: list[str],
    model_name: str = "som-model",
    label_column: Optional[str] = None,
    grid_x: Optional[int] = None,
    grid_y: Optional[int] = None,
    sigma: float = 1.0,
    learning_rate: float = 0.5,
    num_iterations: int = 100,
    training_mode: Literal[
        "online", "batch_offline", "batch_offline_fast"
    ] = "online",
    timeout_seconds: int = 3600,
) -> dict[str, Any]:
    """一键流程：上传 CSV → 训练 → 等待完成 → 部署为 active 模型。"""
    client = _get_client()
    dataset = client.upload_dataset(file_path)
    dataset_id = dataset["id"]

    if grid_x is None or grid_y is None:
        suggested = client.suggest_grid(dataset_id)
        grid_x = grid_x if grid_x is not None else suggested["grid_x"]
        grid_y = grid_y if grid_y is not None else suggested["grid_y"]

    job = client.start_training(
        {
            "dataset_id": dataset_id,
            "model_name": model_name,
            "feature_columns": feature_columns,
            "label_column": label_column,
            "grid_x": grid_x,
            "grid_y": grid_y,
            "sigma": sigma,
            "learning_rate": learning_rate,
            "num_iterations": num_iterations,
            "training_mode": training_mode,
        }
    )
    job_id = job["job_id"]

    elapsed = 0.0
    poll = 2.0
    while elapsed < timeout_seconds:
        status_job = client.get_training_job(job_id)
        status = status_job.get("status")
        if status == "completed":
            model_id = status_job.get("model_id")
            if not model_id:
                raise RuntimeError("Training completed but model_id missing")
            deployed = client.activate_model(model_id)
            return {
                "dataset_id": dataset_id,
                "job_id": job_id,
                "model": _compact_model(deployed),
                "training_metrics": status_job.get("metrics"),
            }
        if status == "failed":
            raise RuntimeError(
                status_job.get("error") or status_job.get("message") or "Training failed"
            )
        await asyncio.sleep(poll)
        elapsed += poll

    raise TimeoutError(f"Training job {job_id} did not finish within {timeout_seconds}s")


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
