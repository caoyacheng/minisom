const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  if (res.headers.get('content-type')?.includes('application/json')) {
    return res.json();
  }
  return res as unknown as T;
}

export interface DatasetPreview {
  id: string;
  name: string;
  rows: number;
  columns: string[];
  numeric_columns: string[];
  preview: Record<string, unknown>[];
}

export interface TrainingConfig {
  model_type?: 'som';
  dataset_id: string;
  model_name: string;
  feature_columns: string[];
  label_column?: string | null;
  normalize: boolean;
  grid_x: number;
  grid_y: number;
  sigma: number;
  learning_rate: number;
  num_iterations: number;
  topology: 'rectangular' | 'hexagonal';
  neighborhood_function: 'gaussian' | 'mexican_hat' | 'bubble' | 'triangle';
  activation_distance: 'euclidean' | 'cosine' | 'manhattan' | 'chebyshev';
  training_mode: 'online' | 'batch_offline' | 'batch_offline_fast';
  weight_init: 'random' | 'pca';
  random_order: boolean;
  use_epochs: boolean;
}

export interface TrainingJobStatus {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  metrics: {
    iteration?: number;
    total_iterations?: number;
    quantization_error?: number;
  };
  model_id?: string;
  error?: string;
}

export interface Visualizations {
  u_matrix: number[][];
  activation_response: number[][];
  grid_x: number;
  grid_y: number;
}

export interface ModelRecord {
  id: string;
  name: string;
  model_type?: string;
  created_at: string;
  dataset_id: string;
  hyperparameters: Record<string, unknown>;
  metrics: Record<string, number | null>;
  feature_columns: string[];
  label_column?: string | null;
  normalize: boolean;
  is_active: boolean;
  version?: number;
  storage_uri?: string | null;
  content_sha256?: string | null;
  size_bytes?: number | null;
}

export interface DatasetSummary {
  id: string;
  name: string;
  rows: number;
  columns: string[];
  numeric_columns: string[];
  size_bytes: number;
  created_at: string;
}

export interface AnomalyRecord {
  row_index: number;
  row_id: string;
  quantization_error: number;
  bmu_x: number;
  bmu_y: number;
  label?: string | null;
  reasons: string[];
  row_data?: Record<string, unknown>;
}

export interface SampleSummary {
  row_index: number;
  row_id: string;
  quantization_error: number;
  bmu_x: number;
  bmu_y: number;
  is_anomaly: boolean;
  label?: string | null;
}

export interface EvaluationResult {
  run_id: string;
  model_id: string;
  dataset_id: string;
  quantization_error: number;
  topographic_error: number;
  winners: [number, number][];
  labels_map?: Record<string, Record<string, number>> | null;
  anomalies: AnomalyRecord[];
  samples: SampleSummary[];
  anomaly_count: number;
  qe_threshold?: number | null;
  grid_x: number;
  grid_y: number;
  anomaly_map: number[][];
  sample_map: number[][];
  reason_stats: Record<string, number>;
}

export const api = {
  health: () =>
    request<{
      status: string;
      active_model_id?: string;
      storage_backend?: string;
      database_url_scheme?: string;
    }>('/health'),

  listDatasets: () =>
    request<{ datasets: DatasetSummary[] }>('/datasets'),

  uploadDataset: async (file: File): Promise<DatasetPreview> => {
    const form = new FormData();
    form.append('file', file);
    return request('/datasets/upload', { method: 'POST', body: form });
  },

  getDataset: (id: string) => request<DatasetPreview>(`/datasets/${id}`),

  suggestGrid: (id: string) =>
    request<{ grid_x: number; grid_y: number }>(`/datasets/${id}/suggest-grid`),

  startTraining: (config: TrainingConfig) =>
    request<TrainingJobStatus>('/training/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }),

  getJob: (jobId: string) =>
    request<TrainingJobStatus>(`/training/jobs/${jobId}`),

  getVisualizations: (jobId: string) =>
    request<Visualizations>(`/training/jobs/${jobId}/visualizations`),

  listModels: () =>
    request<{ models: ModelRecord[]; active_model_id?: string }>('/models'),

  getModel: (id: string) => request<ModelRecord>(`/models/${id}`),

  activateModel: (id: string) =>
    request<ModelRecord>(`/models/${id}/activate`, { method: 'POST' }),

  deleteModel: (id: string) =>
    request<{ status: string }>(`/models/${id}`, { method: 'DELETE' }),

  downloadModelUrl: (id: string) => `${BASE}/models/${id}/download`,

  runEvaluation: (payload: {
    model_id: string;
    dataset_id: string;
    feature_columns?: string[];
    label_column?: string | null;
    normalize?: boolean;
  }) =>
    request<EvaluationResult>('/evaluation/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  predict: (samples: number[][], modelId?: string) =>
    request<{
      model_id: string;
      winners: [number, number][];
      quantized: number[][];
    }>('/inference/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_id: modelId, samples }),
    }),

  predictFile: async (file: File, modelId?: string) => {
    const form = new FormData();
    form.append('file', file);
    const url = modelId
      ? `/inference/predict-file?model_id=${modelId}`
      : '/inference/predict-file';
    return request<{ model_id: string; rows: number; csv: string }>(url, {
      method: 'POST',
      body: form,
    });
  },
};
