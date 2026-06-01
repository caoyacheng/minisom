import type { ModelRecord } from '../api/client';
import {
  getModelType,
  resolveModelTypeId,
} from '../model-types/registry';
import { TASK_LABELS } from '../model-types/types';
import type { ModelTask } from '../model-types/types';

export type SortKey =
  | 'created_desc'
  | 'created_asc'
  | 'qe_asc'
  | 'qe_desc'
  | 'name';

export const SORT_LABELS: Record<SortKey, string> = {
  created_desc: '最近创建',
  created_asc: '最早创建',
  qe_asc: '量化误差 ↑',
  qe_desc: '量化误差 ↓',
  name: '名称 A-Z',
};

export interface ModelFilterParams {
  q?: string;
  task?: ModelTask | 'all';
  type?: string;
  sort?: SortKey;
  activeOnly?: boolean;
}

export function modelTypeIdOf(m: ModelRecord): string {
  return resolveModelTypeId((m as ModelRecord & { model_type?: string }).model_type);
}

export function modelMatchesQuery(m: ModelRecord, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    m.name,
    m.id,
    m.dataset_id,
    ...m.feature_columns,
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(needle);
}

export function filterAndSortModels(
  models: ModelRecord[],
  params: ModelFilterParams,
): ModelRecord[] {
  const {
    q = '',
    task = 'all',
    type = 'all',
    sort = 'created_desc',
    activeOnly = false,
  } = params;

  let list = models.filter((m) => {
    const typeId = modelTypeIdOf(m);
    const def = getModelType(typeId);
    if (type !== 'all' && typeId !== type) return false;
    if (task !== 'all' && def?.task !== task) return false;
    if (activeOnly && !m.is_active) return false;
    if (!modelMatchesQuery(m, q)) return false;
    return true;
  });

  list = [...list].sort((a, b) => {
    switch (sort) {
      case 'created_asc':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'qe_asc': {
        const qa = a.metrics.quantization_error ?? Infinity;
        const qb = b.metrics.quantization_error ?? Infinity;
        return qa - qb;
      }
      case 'qe_desc': {
        const qa = a.metrics.quantization_error ?? -Infinity;
        const qb = b.metrics.quantization_error ?? -Infinity;
        return qb - qa;
      }
      case 'name':
        return a.name.localeCompare(b.name, 'zh-CN');
      case 'created_desc':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return list;
}

/** 生成工业 Model Card（Markdown 风格，便于复制） */
export function buildModelCardText(m: ModelRecord): string {
  const typeId = modelTypeIdOf(m);
  const def = getModelType(typeId);
  const task = def ? TASK_LABELS[def.task] : '—';
  const qe = m.metrics.quantization_error?.toFixed(4) ?? '—';
  const te = m.metrics.topographic_error?.toFixed(4) ?? '—';

  return `# ${m.name}

## 元数据
- **model_id**: \`${m.id}\`
- **model_type**: ${def?.label ?? typeId}
- **task**: ${task}
- **created_at**: ${new Date(m.created_at).toISOString()}
- **is_active**: ${m.is_active}

## 训练数据
- **dataset_id**: \`${m.dataset_id}\`
- **feature_columns**: ${m.feature_columns.join(', ')}
- **label_column**: ${m.label_column ?? '无'}
- **normalize**: ${m.normalize}

## 指标
- **quantization_error**: ${qe}
- **topographic_error**: ${te}

## 说明
无监督拓扑映射模型，用于工艺异常检测与工况可视化。
部署前请在评估页用代表性测试集验证阈值与误报率。
`;
}
