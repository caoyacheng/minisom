import type { ModelRecord } from '../api/client';
import { StatusBadge } from './ui';

interface Props {
  model: ModelRecord;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ModelCard({ model, onActivate, onDelete }: Props) {
  return (
    <section className={`panel ${model.is_active ? 'active-model' : ''}`}>
      <div className="panel-header-row">
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{model.name}</h3>
          <p className="muted" style={{ marginTop: 2 }}>{model.id}</p>
          <p className="muted" style={{ marginTop: 2 }}>
            {new Date(model.created_at).toLocaleString('zh-CN')}
          </p>
        </div>
        {model.is_active && <StatusBadge label="已激活" tone="ok" />}
      </div>
      <dl className="kv-grid" style={{ marginBottom: 16 }}>
        <dt>量化误差</dt>
        <dd>{model.metrics.quantization_error?.toFixed(4) ?? '—'}</dd>
        <dt>拓扑误差</dt>
        <dd>{model.metrics.topographic_error?.toFixed(4) ?? '—'}</dd>
        <dt>网格</dt>
        <dd>
          {String(model.hyperparameters.grid_x)}×{String(model.hyperparameters.grid_y)}
        </dd>
        <dt>特征数</dt>
        <dd>{model.feature_columns.length}</dd>
      </dl>
      <div className="row">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onActivate(model.id)}
        >
          设为推理模型
        </button>
        <a
          className="btn btn-secondary btn-sm"
          href={`/api/models/${model.id}/download`}
          download
        >
          下载模型
        </a>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => onDelete(model.id)}
        >
          删除
        </button>
      </div>
    </section>
  );
}
