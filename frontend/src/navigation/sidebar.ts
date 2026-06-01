import {
  Activity,
  Database,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Rocket,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';

export interface SidebarItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface SidebarGroup {
  id: string;
  label: string;
  items: SidebarItem[];
}

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    id: 'workspace',
    label: '工作台',
    items: [
      { to: '/', label: '总览', icon: LayoutDashboard, end: true },
      { to: '/pipeline', label: '建模流水线', icon: Waypoints },
      { to: '/models', label: '模型中心', icon: Layers },
    ],
  },
  {
    id: 'modeling',
    label: '数据与建模',
    items: [
      { to: '/datasets', label: '数据集', icon: Database },
      { to: '/train', label: '训练', icon: GraduationCap },
      { to: '/evaluate', label: '评估', icon: FlaskConical },
    ],
  },
  {
    id: 'ops',
    label: '部署与运维',
    items: [
      { to: '/deploy', label: '部署', icon: Rocket },
      { to: '/monitor', label: '运行监控', icon: Activity },
    ],
  },
];
