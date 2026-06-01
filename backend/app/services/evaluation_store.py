from __future__ import annotations

from app.schemas import EvaluationResult
from app.storage.database import session_scope
from app.storage.db_models import EvaluationRunRow


def save_evaluation_run(result: EvaluationResult) -> None:
    with session_scope() as session:
        session.merge(
            EvaluationRunRow(
                id=result.run_id,
                model_id=result.model_id,
                dataset_id=result.dataset_id,
                payload=result.model_dump(mode="json"),
            )
        )
        session.commit()


def get_evaluation_run(run_id: str) -> EvaluationResult:
    with session_scope() as session:
        row = session.get(EvaluationRunRow, run_id)
        if row is None:
            raise KeyError(f"Evaluation run {run_id} not found")
        return EvaluationResult.model_validate(row.payload)
