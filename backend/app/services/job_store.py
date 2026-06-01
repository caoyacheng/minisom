import threading
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class JobState:
    job_id: str
    status: str = "pending"
    progress: float = 0.0
    message: str = ""
    metrics: dict[str, Any] = field(default_factory=dict)
    model_id: Optional[str] = None
    error: Optional[str] = None
    visualizations: Optional[dict[str, Any]] = None


class JobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, JobState] = {}
        self._lock = threading.Lock()

    def create(self) -> str:
        job_id = str(uuid.uuid4())
        with self._lock:
            self._jobs[job_id] = JobState(job_id=job_id)
        return job_id

    def get(self, job_id: str) -> JobState:
        with self._lock:
            if job_id not in self._jobs:
                raise KeyError(f"Job {job_id} not found")
            return self._jobs[job_id]

    def update(self, job_id: str, **kwargs: Any) -> JobState:
        with self._lock:
            job = self._jobs[job_id]
            for key, value in kwargs.items():
                setattr(job, key, value)
            return job


job_store = JobStore()
