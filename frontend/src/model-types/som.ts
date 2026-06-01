import { Grid3x3 } from 'lucide-react';
import type { ModelTypeDefinition } from './types';

export const somModelType: ModelTypeDefinition = {
  id: 'som',
  label: '自组织映射 (SOM)',
  shortLabel: 'SOM',
  description:
    '无监督拓扑映射，用于工艺异常检测、工况聚类与 U-Matrix 可视化。适合多维传感器/批次数据的模式发现。',
  task: 'anomaly',
  status: 'available',
  icon: Grid3x3,
  useCases: ['工艺异常', '工况聚类', '质量地图'],
  dataRequirements: 'CSV 数值特征列；可选标签列用于分布可视化',
  trainPath: '/train?type=som',
  evaluatePath: '/evaluate',
};
