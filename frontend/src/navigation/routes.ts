/** 页面路由与 Topbar 标题 */
export const ROUTE_TITLES: Record<string, string> = {
  '/': '总览',
  '/pipeline': '建模流水线',
  '/models': '模型中心',
  '/datasets': '数据集',
  '/train': '训练',
  '/evaluate': '评估',
  '/deploy': '部署',
  '/monitor': '运行监控',
};

export function pageTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith('/train')) return ROUTE_TITLES['/train'];
  const modelDetail = pathname.match(/^\/models\/([^/]+)$/);
  if (modelDetail) return '模型详情';
  return '工业模型工作台';
}

/** 建模工作流步骤（用于总览与面包屑引导） */
export const WORKFLOW_STEPS = [
  { id: 'datasets', label: '准备数据', path: '/datasets', desc: '上传或接入 CSV / 时序数据' },
  { id: 'train', label: '选择算法并训练', path: '/train', desc: '按任务类型配置超参数' },
  { id: 'evaluate', label: '评估验证', path: '/evaluate', desc: '指标、异常与可视化分析' },
  { id: 'deploy', label: '部署上线', path: '/deploy', desc: '版本激活、REST 与批量推理' },
  { id: 'monitor', label: '运行监控', path: '/monitor', desc: '推理状态与漂移告警（规划中）' },
] as const;
