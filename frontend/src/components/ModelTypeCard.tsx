import { Link } from 'react-router-dom';
import {
  getModelType,
  resolveModelTypeId,
} from '../model-types/registry';
import { TASK_LABELS, TASK_TONE, type ModelTypeDefinition } from '../model-types/types';
import { StatusBadge } from './ui';

interface Props {
  modelType: ModelTypeDefinition;
  selected?: boolean;
  compact?: boolean;
  onSelect?: (id: string) => void;
}

export function ModelTypeCard({ modelType, selected, compact, onSelect }: Props) {
  const Icon = modelType.icon;
  const disabled = modelType.status === 'coming_soon';

  const inner = (
    <>
      <div className="model-type-card-head">
        <div className="model-type-icon" aria-hidden>
          <Icon size={18} />
        </div>
        <div className="model-type-meta">
          <strong>{modelType.label}</strong>
          {!compact && (
            <span className="muted">{TASK_LABELS[modelType.task]}</span>
          )}
        </div>
        <StatusBadge
          label={modelType.status === 'available' ? '可用' : '即将推出'}
          tone={modelType.status === 'available' ? 'ok' : 'muted'}
        />
      </div>
      {!compact && (
        <>
          <p className="muted model-type-desc">{modelType.description}</p>
          <div className="flag-row">
            {modelType.useCases.map((tag) => (
              <span key={tag} className="flag">
                {tag}
              </span>
            ))}
          </div>
        </>
      )}
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        className={`model-type-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
        disabled={disabled}
        onClick={() => !disabled && onSelect(modelType.id)}
      >
        {inner}
      </button>
    );
  }

  if (disabled) {
    return <div className={`model-type-card disabled ${compact ? 'compact' : ''}`}>{inner}</div>;
  }

  return (
    <Link
      to={modelType.trainPath ?? `/train?type=${modelType.id}`}
      className={`model-type-card ${compact ? 'compact' : ''}`}
    >
      {inner}
    </Link>
  );
}

export function ModelTypeBadge({ modelTypeId }: { modelTypeId?: string | null }) {
  const id = resolveModelTypeId(modelTypeId);
  const def = getModelType(id);
  if (!def) return <StatusBadge label={id} tone="muted" />;
  return (
    <StatusBadge label={def.shortLabel} tone={TASK_TONE[def.task]} />
  );
}
