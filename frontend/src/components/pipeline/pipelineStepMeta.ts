import type { LucideIcon } from 'lucide-react';
import { Activity, BarChart3, CloudUpload, Cpu, Database } from 'lucide-react';

import type { PipelineStepState } from './types';

export interface PipelineStepMeta {
  icon: LucideIcon;
  tone: string;
}

export const PIPELINE_STEP_META: Record<string, PipelineStepMeta> = {
  datasets: { icon: Database, tone: '#3b82f6' },
  train: { icon: Cpu, tone: '#8b5cf6' },
  evaluate: { icon: BarChart3, tone: '#06b6d4' },
  deploy: { icon: CloudUpload, tone: '#10b981' },
  monitor: { icon: Activity, tone: '#f59e0b' },
};

export const PIPELINE_STATE_LABEL: Record<PipelineStepState, string> = {
  idle: '待配置',
  active: '进行中',
  done: '已完成',
  error: '需处理',
};
