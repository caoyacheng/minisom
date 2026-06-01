import type { LucideIcon } from 'lucide-react';

/** 工业建模任务类型 */
export type ModelTask =
  | 'anomaly'
  | 'forecast'
  | 'classification'
  | 'regression'
  | 'clustering';

export type ModelTypeStatus = 'available' | 'coming_soon';

/** 前端 Model Type 插件元数据（驱动 IA 与训练向导） */
export interface ModelTypeDefinition {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  task: ModelTask;
  status: ModelTypeStatus;
  icon: LucideIcon;
  /** 适用场景标签 */
  useCases: string[];
  /** 输入数据要求简述 */
  dataRequirements: string;
  /** 评估页路径（可带 query） */
  evaluatePath?: string;
  trainPath?: string;
}

export const TASK_LABELS: Record<ModelTask, string> = {
  anomaly: '异常检测',
  forecast: '时序预测',
  classification: '分类判定',
  regression: '回归预测',
  clustering: '聚类分群',
};

export const TASK_TONE: Record<ModelTask, 'warn' | 'ok' | 'muted'> = {
  anomaly: 'warn',
  forecast: 'ok',
  classification: 'ok',
  regression: 'muted',
  clustering: 'muted',
};
