from collections import Counter
from typing import Any, Callable, Optional

import numpy as np
from numpy import argsort, diff, hstack, unravel_index
from numpy.linalg import norm

from app.models.som.schemas import SomTrainingConfig
from app.models.som.vendor.minisom import MiniSom
from app.services.data_service import load_feature_matrix, load_labels


def create_som(config: SomTrainingConfig) -> MiniSom:
    return MiniSom(
        config.grid_x,
        config.grid_y,
        len(config.feature_columns),
        sigma=config.sigma,
        learning_rate=config.learning_rate,
        neighborhood_function=config.neighborhood_function,
        topology=config.topology,
        activation_distance=config.activation_distance,
    )


def train_som(
    config: SomTrainingConfig,
    data: np.ndarray,
    progress_callback: Optional[Callable[[int, int, float], None]] = None,
) -> MiniSom:
    som = create_som(config)
    if config.weight_init == "pca" and data.shape[1] >= 2:
        som.pca_weights_init(data)
    else:
        som.random_weights_init(data)

    total = config.num_iterations
    report_every = max(1, total // 20)

    if config.training_mode == "online":
        for step in range(total):
            som.train(
                data,
                1,
                random_order=config.random_order,
                use_epochs=config.use_epochs,
            )
            current = step + 1
            if progress_callback and (
                current % report_every == 0 or current == total
            ):
                qe = float(som.quantization_error(data))
                progress_callback(current, total, qe)
    elif config.training_mode == "batch_offline":
        for i in range(total):
            som.train_batch_offline(data, 1)
            current = i + 1
            if progress_callback and (
                current % report_every == 0 or current == total
            ):
                qe = float(som.quantization_error(data))
                progress_callback(current, total, qe)
    else:
        for i in range(total):
            som.train_batch_offline_fast(data, 1)
            current = i + 1
            if progress_callback and (
                current % report_every == 0 or current == total
            ):
                qe = float(som.quantization_error(data))
                progress_callback(current, total, qe)

    return som


def evaluate_som(
    som: MiniSom,
    data: np.ndarray,
    labels: Optional[list[Any]] = None,
) -> dict[str, Any]:
    qe = float(som.quantization_error(data))
    te = float(som.topographic_error(data))
    winners = [som.winner(row) for row in data]

    labels_map = None
    if labels is not None:
        raw = som.labels_map(data, labels)
        labels_map = {
            f"{pos[0]},{pos[1]}": dict(counts)
            for pos, counts in raw.items()
        }

    return {
        "quantization_error": qe,
        "topographic_error": te,
        "winners": winners,
        "labels_map": labels_map,
    }


def _per_sample_topographic_flags(som: MiniSom, data: np.ndarray) -> np.ndarray:
    if som.topology == "hexagonal":
        b2mu_inds = argsort(som._distance_from_weights(data), axis=1)[:, :2]
        flags = []
        for bmu in b2mu_inds:
            c1 = som._get_euclidean_coordinates_from_index(bmu[0])
            c2 = som._get_euclidean_coordinates_from_index(bmu[1])
            flags.append(not np.isclose(1.0, norm(np.array(c1) - np.array(c2))))
        return np.array(flags, dtype=bool)

    t = 1.42
    b2mu_inds = argsort(som._distance_from_weights(data), axis=1)[:, :2]
    b2my_xy = unravel_index(b2mu_inds, som._weights.shape[:2])
    dxdy = hstack([diff(b2my_xy[0], axis=1), diff(b2my_xy[1], axis=1)])
    distance = norm(dxdy, axis=1)
    return distance > t


def detect_anomalies(
    som: MiniSom,
    data: np.ndarray,
    row_ids: list[str],
    labels: Optional[list[Any]] = None,
) -> dict[str, Any]:
    quantized = som.quantization(data)
    per_qe = norm(data - quantized, axis=1)
    winners = [som.winner(row) for row in data]
    topo_flags = _per_sample_topographic_flags(som, data)
    win_counts = Counter(winners)

    mean_qe = float(per_qe.mean())
    std_qe = float(per_qe.std())
    qe_threshold = mean_qe + 1.5 * std_qe if std_qe > 1e-9 else mean_qe * 1.25

    counts = sorted(win_counts.values())
    rare_cutoff = counts[max(0, len(counts) // 4 - 1)] if counts else 1
    rare_cutoff = max(2, rare_cutoff)

    gx, gy = som._weights.shape[0], som._weights.shape[1]
    anomaly_map = np.zeros((gx, gy), dtype=int)
    sample_map = np.zeros((gx, gy), dtype=int)
    samples = []
    anomalies = []
    reason_stats: dict[str, int] = {}

    for i in range(len(data)):
        wx, wy = winners[i]
        sample_map[wx, wy] += 1
        reasons: list[str] = []
        if per_qe[i] > qe_threshold:
            reasons.append("量化误差偏高")
        if topo_flags[i]:
            reasons.append("与次近状态在地图上不相邻")
        if win_counts[winners[i]] <= rare_cutoff:
            reasons.append("落在样本稀少的地图区域")

        is_anomaly = bool(reasons)
        samples.append({
            "row_index": i,
            "row_id": row_ids[i] if i < len(row_ids) else str(i + 1),
            "quantization_error": float(per_qe[i]),
            "bmu_x": int(wx),
            "bmu_y": int(wy),
            "is_anomaly": is_anomaly,
            "label": str(labels[i]) if labels is not None else None,
        })

        if is_anomaly:
            anomaly_map[wx, wy] += 1
            for r in reasons:
                reason_stats[r] = reason_stats.get(r, 0) + 1
            anomalies.append({
                "row_index": i,
                "row_id": row_ids[i] if i < len(row_ids) else str(i + 1),
                "quantization_error": float(per_qe[i]),
                "bmu_x": int(wx),
                "bmu_y": int(wy),
                "label": str(labels[i]) if labels is not None else None,
                "reasons": reasons,
            })

    anomalies.sort(key=lambda x: x["quantization_error"], reverse=True)
    return {
        "anomalies": anomalies,
        "samples": samples,
        "anomaly_count": len(anomalies),
        "qe_threshold": qe_threshold,
        "grid_x": int(gx),
        "grid_y": int(gy),
        "anomaly_map": anomaly_map.tolist(),
        "sample_map": sample_map.tolist(),
        "reason_stats": reason_stats,
    }


def visualizations(som: MiniSom, data: np.ndarray) -> dict[str, Any]:
    u_matrix = som.distance_map().tolist()
    activation = som.activation_response(data).tolist()
    return {
        "u_matrix": u_matrix,
        "activation_response": activation,
        "grid_x": som._weights.shape[0],
        "grid_y": som._weights.shape[1],
    }


def predict(som: MiniSom, samples: np.ndarray) -> dict[str, Any]:
    winners = [som.winner(row) for row in samples]
    quantized = som.quantization(samples).tolist()
    return {
        "winners": winners,
        "quantized": quantized,
    }


def load_training_data(
    config: SomTrainingConfig,
) -> tuple[np.ndarray, Optional[list[Any]]]:
    data = load_feature_matrix(
        config.dataset_id,
        config.feature_columns,
        normalize=config.normalize,
    )
    labels = load_labels(config.dataset_id, config.label_column)
    return data, labels
