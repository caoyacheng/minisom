import { Link } from 'react-router-dom';
import type { ModelRecord } from '../api/client';
import { ModelTypeBadge } from './ModelTypeCard';
import { StatusBadge } from './ui';
import { getModelType } from '../model-types/registry';
import { modelTypeIdOf } from '../utils/modelFilters';
import { TASK_LABELS } from '../model-types/types';

interface Props {
  model: ModelRecord;
  activeModelId?: string | null;
  compact?: boolean;
}

export default function ModelListItem({ model, activeModelId, compact }: Props) {
  const typeId = modelTypeIdOf(model);
  const def = getModelType(typeId);

  return (
    <article className={`model-list-item ${model.is_active ? 'active' : ''}`}>
      <div className="model-list-item-main">
        <div className="model-list-item-head">
          <Link to={`/models/${model.id}`} className="model-list-item-title">
            {model.name}
          </Link>
          <ModelTypeBadge modelTypeId={typeId} />
          {def && <StatusBadge label={TASK_LABELS[def.task]} tone="muted" />}
          {model.is_active && <StatusBadge label="已激活" tone="ok" />}
        </div>
        {!compact && (
          <p className="muted model-list-item-id">{model.id}</p>
        )}
        <dl className="model-list-item-metrics">
          <div>
            <dt>QE</dt>
            <dd>{model.metrics.quantization_error?.toFixed(4) ?? '—'}</dd>
          </div>
          <div>
            <dt>TE</dt>
            <dd>{model.metrics.topographic_error?.toFixed(4) ?? '—'}</dd>
          </div>
          <div>
            <dt>特征</dt>
            <dd>{model.feature_columns.length}</dd>
          </div>
          <div>
            <dt>创建</dt>
            <dd>{new Date(model.created_at).toLocaleDateString('zh-CN')}</dd>
          </div>
        </dl>
      </div>
      <div className="model-list-item-actions">
        <Link to={`/models/${model.id}`} className="btn btn-secondary btn-sm">
          详情
        </Link>
        <Link
          to={`/evaluate?model=${model.id}`}
          className="btn btn-secondary btn-sm"
        >
          评估
        </Link>
        {activeModelId !== model.id && (
          <Link to="/deploy" className="btn btn-ghost btn-sm">
            部署
          </Link>
        )}
      </div>
    </article>
  );
}
