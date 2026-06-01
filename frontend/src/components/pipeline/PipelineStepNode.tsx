import { memo, type CSSProperties } from 'react';
import { GripVertical } from 'lucide-react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

import { StepConfigBody } from './configs/StepConfigBody';
import { PIPELINE_STATE_LABEL, PIPELINE_STEP_META } from './pipelineStepMeta';
import type { PipelineNodeData } from './types';

function PipelineStepNodeComponent({ data, selected }: NodeProps) {
  const d = data as PipelineNodeData;
  const meta = PIPELINE_STEP_META[d.stepId];
  const Icon = meta?.icon;
  const tone = meta?.tone ?? 'var(--accent)';

  return (
    <div
      className={`pipeline-wf-node pipeline-wf-node--${d.state} ${
        selected ? 'pipeline-wf-node--selected' : ''
      }`}
      style={{ '--wf-tone': tone } as CSSProperties}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="pipeline-wf-handle pipeline-wf-handle--in"
      />
      <header className="pipeline-wf-node__head">
        <GripVertical size={14} className="pipeline-wf-node__grip" aria-hidden />
        {Icon && (
          <span className="pipeline-wf-node__icon" aria-hidden>
            <Icon size={16} strokeWidth={2.2} />
          </span>
        )}
        <div className="pipeline-wf-node__titles">
          <span className="pipeline-wf-node__label">{d.label}</span>
          <span className="pipeline-wf-node__desc">{d.desc}</span>
        </div>
        <span className={`pipeline-wf-node__badge pipeline-wf-node__badge--${d.state}`}>
          {PIPELINE_STATE_LABEL[d.state]}
        </span>
      </header>
      {d.detail && d.state !== 'idle' && (
        <p className={`pipeline-wf-node__detail pipeline-wf-node__detail--${d.state}`}>
          {d.detail}
        </p>
      )}
      <div className="pipeline-wf-node__body nodrag nopan">
        <StepConfigBody stepId={d.stepId} />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="pipeline-wf-handle pipeline-wf-handle--out"
      />
    </div>
  );
}

export const PipelineStepNode = memo(PipelineStepNodeComponent);
