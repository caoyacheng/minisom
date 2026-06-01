"""HTTP client for the Som Web Backend (FastAPI)."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

import httpx


def _api_base() -> str:
    return os.environ.get("SOM_API_BASE", "http://127.0.0.1:8000").rstrip("/")


def _raise_for_status(resp: httpx.Response) -> None:
    if resp.is_success:
        return
    detail: Any = resp.text
    if "application/json" in resp.headers.get("content-type", ""):
        try:
            body = resp.json()
            detail = body.get("detail", body)
        except Exception:
            pass
    raise RuntimeError(f"API {resp.status_code}: {detail}")


class SomApiClient:
    def __init__(self, base_url: Optional[str] = None, timeout: float = 300.0) -> None:
        self.base_url = (base_url or _api_base()).rstrip("/")
        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            trust_env=False,
        )

    def close(self) -> None:
        self._client.close()

    def _json(self, method: str, path: str, **kwargs: Any) -> Any:
        resp = self._client.request(method, path, **kwargs)
        _raise_for_status(resp)
        if resp.status_code == 204 or not resp.content:
            return {}
        return resp.json()

    def health(self) -> dict[str, Any]:
        return self._json("GET", "/api/health")

    def upload_dataset(self, file_path: str) -> dict[str, Any]:
        path = Path(file_path).expanduser().resolve()
        if not path.is_file():
            raise FileNotFoundError(f"CSV not found: {path}")
        with path.open("rb") as handle:
            resp = self._client.post(
                "/api/datasets/upload",
                files={"file": (path.name, handle, "text/csv")},
            )
        _raise_for_status(resp)
        return resp.json()

    def get_dataset(self, dataset_id: str, limit: int = 10) -> dict[str, Any]:
        return self._json("GET", f"/api/datasets/{dataset_id}", params={"limit": limit})

    def suggest_grid(self, dataset_id: str) -> dict[str, Any]:
        return self._json("GET", f"/api/datasets/{dataset_id}/suggest-grid")

    def start_training(self, config: dict[str, Any]) -> dict[str, Any]:
        return self._json("POST", "/api/training/start", json=config)

    def get_training_job(self, job_id: str) -> dict[str, Any]:
        return self._json("GET", f"/api/training/jobs/{job_id}")

    def get_training_visualizations(self, job_id: str) -> dict[str, Any]:
        return self._json("GET", f"/api/training/jobs/{job_id}/visualizations")

    def list_models(self) -> dict[str, Any]:
        return self._json("GET", "/api/models")

    def get_model(self, model_id: str) -> dict[str, Any]:
        return self._json("GET", f"/api/models/{model_id}")

    def activate_model(self, model_id: str) -> dict[str, Any]:
        return self._json("POST", f"/api/models/{model_id}/activate")

    def delete_model(self, model_id: str) -> dict[str, Any]:
        return self._json("DELETE", f"/api/models/{model_id}")

    def run_evaluation(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._json("POST", "/api/evaluation/run", json=payload)

    def predict(self, samples: list[list[float]], model_id: Optional[str] = None) -> dict[str, Any]:
        body: dict[str, Any] = {"samples": samples}
        if model_id:
            body["model_id"] = model_id
        return self._json("POST", "/api/inference/predict", json=body)

    def predict_file(self, file_path: str, model_id: Optional[str] = None) -> dict[str, Any]:
        path = Path(file_path).expanduser().resolve()
        if not path.is_file():
            raise FileNotFoundError(f"CSV not found: {path}")
        params = {}
        if model_id:
            params["model_id"] = model_id
        with path.open("rb") as handle:
            resp = self._client.post(
                "/api/inference/predict-file",
                params=params,
                files={"file": (path.name, handle, "text/csv")},
            )
        _raise_for_status(resp)
        return resp.json()
