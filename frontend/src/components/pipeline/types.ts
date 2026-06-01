export type PipelineStepState = 'idle' | 'active' | 'done' | 'error';

export interface PipelineStepStatus {
  id: string;
  label: string;
  path: string;
  desc: string;
  state: PipelineStepState;
  detail?: string;
}

export interface PipelineNodeData extends Record<string, unknown> {
  stepId: string;
  label: string;
  desc: string;
  path: string;
  state: PipelineStepState;
  detail?: string;
  index: number;
}
