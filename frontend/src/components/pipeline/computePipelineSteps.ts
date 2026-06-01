import { WORKFLOW_STEPS } from '../../navigation/routes';
import type { DatasetPreview, EvaluationResult, ModelRecord, TrainingJobStatus } from '../../api/client';
import type { PipelineStepState, PipelineStepStatus } from './types';

export interface PipelineContext {
  datasetCount: number;
  trainDataset: DatasetPreview | null;
  trainJob: TrainingJobStatus | null;
  trainTraining: boolean;
  testResult: EvaluationResult | null;
  activeModel: ModelRecord | null | undefined;
  modelCount: number;
  backendOk: boolean | null;
}

export function computePipelineSteps(ctx: PipelineContext): PipelineStepStatus[] {
  const stateFor = (id: string): PipelineStepState => {
    switch (id) {
      case 'datasets': {
        if (ctx.datasetCount > 0 || ctx.trainDataset) return 'done';
        return 'idle';
      }
      case 'train': {
        if (ctx.trainJob?.status === 'failed') return 'error';
        if (ctx.trainTraining || ctx.trainJob?.status === 'running' || ctx.trainJob?.status === 'pending') {
          return 'active';
        }
        if (ctx.trainJob?.status === 'completed' || ctx.modelCount > 0) return 'done';
        return 'idle';
      }
      case 'evaluate':
        return ctx.testResult ? 'done' : ctx.modelCount > 0 ? 'idle' : 'idle';
      case 'deploy':
        return ctx.activeModel ? 'done' : ctx.modelCount > 0 ? 'idle' : 'idle';
      case 'monitor':
        return ctx.activeModel ? 'active' : 'idle';
      default:
        return 'idle';
    }
  };

  const detailFor = (id: string): string | undefined => {
    switch (id) {
      case 'datasets':
        if (ctx.trainDataset) return ctx.trainDataset.name;
        if (ctx.datasetCount > 0) return `${ctx.datasetCount} 个数据集`;
        return undefined;
      case 'train':
        if (ctx.trainJob?.status === 'failed') return ctx.trainJob.error ?? '训练失败';
        if (ctx.trainTraining || ctx.trainJob?.status === 'running') {
          return `${Math.round(ctx.trainJob?.progress ?? 0)}%`;
        }
        if (ctx.trainJob?.status === 'completed' && ctx.trainJob.model_id) {
          return '已生成模型';
        }
        if (ctx.modelCount > 0) return `${ctx.modelCount} 个模型`;
        return undefined;
      case 'evaluate':
        if (ctx.testResult) {
          return `QE ${ctx.testResult.quantization_error.toFixed(3)}`;
        }
        return undefined;
      case 'deploy':
        if (ctx.activeModel) return ctx.activeModel.name;
        return ctx.modelCount > 0 ? '待激活' : undefined;
      case 'monitor':
        if (ctx.backendOk === false) return '后端离线';
        if (ctx.activeModel) return '可推理';
        return '规划中';
      default:
        return undefined;
    }
  };

  return WORKFLOW_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    path: step.path,
    desc: step.desc,
    state: stateFor(step.id),
    detail: detailFor(step.id),
  }));
}
