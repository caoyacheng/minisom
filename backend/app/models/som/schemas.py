from typing import Literal

from pydantic import BaseModel, Field


class SomTrainingConfig(BaseModel):
    model_type: Literal["som"] = "som"
    dataset_id: str
    model_name: str = "som-model"
    feature_columns: list[str]
    label_column: str | None = None
    normalize: bool = True
    grid_x: int = Field(default=8, ge=1, le=100)
    grid_y: int = Field(default=8, ge=1, le=100)
    sigma: float = Field(default=1.0, gt=0)
    learning_rate: float = Field(default=0.5, gt=0, le=1)
    num_iterations: int = Field(default=100, ge=1, le=100000)
    topology: Literal["rectangular", "hexagonal"] = "rectangular"
    neighborhood_function: Literal[
        "gaussian", "mexican_hat", "bubble", "triangle"
    ] = "gaussian"
    activation_distance: Literal[
        "euclidean", "cosine", "manhattan", "chebyshev"
    ] = "euclidean"
    training_mode: Literal[
        "online", "batch_offline", "batch_offline_fast"
    ] = "online"
    weight_init: Literal["random", "pca"] = "pca"
    random_order: bool = False
    use_epochs: bool = False


class SomVisualizations(BaseModel):
    u_matrix: list[list[float]]
    activation_response: list[list[float]]
    grid_x: int
    grid_y: int
