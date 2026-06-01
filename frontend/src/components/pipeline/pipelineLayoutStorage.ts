import type { Node } from '@xyflow/react';
import { WORKFLOW_STEPS } from '../../navigation/routes';

const STORAGE_KEY = 'pipeline-node-positions';

const NODE_W = 300;
const GAP = 80;

export function defaultPipelinePositions(): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  WORKFLOW_STEPS.forEach((step, index) => {
    positions[step.id] = { x: index * (NODE_W + GAP), y: 60 };
  });
  return positions;
}

export function loadPipelinePositions(): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPipelinePositions();
    const parsed = JSON.parse(raw) as Record<string, { x: number; y: number }>;
    const defaults = defaultPipelinePositions();
    return { ...defaults, ...parsed };
  } catch {
    return defaultPipelinePositions();
  }
}

export function savePipelinePositions(nodes: Node[]): void {
  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of nodes) {
    positions[node.id] = { x: node.position.x, y: node.position.y };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

export function resetPipelinePositions(): Record<string, { x: number; y: number }> {
  const positions = defaultPipelinePositions();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  return positions;
}

export const PIPELINE_NODE_WIDTH = NODE_W;
