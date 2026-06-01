import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { PIPELINE_NODE_WIDTH } from './pipelineLayoutStorage';
import type { PipelineNodeData, PipelineStepStatus } from './types';

const GAP = 80;

export function pipelineFlowWidth(stepCount: number): number {
  return stepCount * PIPELINE_NODE_WIDTH + Math.max(0, stepCount - 1) * GAP;
}

export function buildPipelineFlow(
  steps: PipelineStepStatus[],
  positions: Record<string, { x: number; y: number }>,
): {
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<PipelineNodeData>[] = steps.map((step, index) => ({
    id: step.id,
    type: 'pipelineStep',
    position: positions[step.id] ?? {
      x: index * (PIPELINE_NODE_WIDTH + GAP),
      y: 40,
    },
    data: {
      stepId: step.id,
      label: step.label,
      desc: step.desc,
      path: step.path,
      state: step.state,
      detail: step.detail,
      index,
    },
    draggable: true,
    selectable: true,
    connectable: false,
  }));

  const edges: Edge[] = steps.slice(0, -1).map((step, index) => {
    const next = steps[index + 1];
    const flowing =
      step.state === 'done' &&
      (next.state === 'active' || next.state === 'done');
    return {
      id: `${step.id}->${next.id}`,
      source: step.id,
      target: next.id,
      type: 'default',
      animated: flowing,
      style: {
        stroke: flowing ? 'var(--wf-edge-active, var(--accent))' : 'var(--wf-edge, var(--border-bright))',
        strokeWidth: flowing ? 2.5 : 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: flowing ? 'var(--accent)' : 'var(--text-muted)',
        width: 16,
        height: 16,
      },
    };
  });

  return { nodes, edges };
}
