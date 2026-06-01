import { Link } from 'react-router-dom';
import { Panel, StatusBadge } from '../components/ui';

const PLANNED = [
  {
    title: '推理调用量',
    desc: 'REST / 批量推理 QPS 与延迟',
    status: '规划中',
  },
  {
    title: '数据漂移',
    desc: '特征分布相对训练集的偏移检测',
    status: '规划中',
  },
  {
    title: '异常告警',
    desc: '评估阈值突破与产线推送',
    status: '规划中',
  },
  {
    title: '模型健康',
    desc: '版本、激活状态、最近推理错误',
    status: '部分可用',
  },
];

export default function Monitor() {
  return (
    <div className="page-stack">
      <Panel>
        <h2 className="page-lead" style={{ marginBottom: 4 }}>
          运行监控
        </h2>
        <p className="muted">
          部署后的模型运行态观测。首版请先在部署页确认激活模型与推理接口；完整监控能力将在平台 Phase 3 接入。
        </p>
        <Link to="/deploy" className="btn btn-primary" style={{ marginTop: 12 }}>
          前往部署
        </Link>
      </Panel>

      <div className="grid-2">
        {PLANNED.map((item) => (
          <Panel key={item.title}>
            <div className="panel-header-row">
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{item.title}</h3>
              <StatusBadge
                label={item.status}
                tone={item.status === '部分可用' ? 'warn' : 'muted'}
              />
            </div>
            <p className="muted">{item.desc}</p>
          </Panel>
        ))}
      </div>

      <Panel title="当前可用手动检查">
        <ul className="check-list">
          <li>
            <code className="inline-code">GET /api/health</code> — 服务与激活模型 ID
          </li>
          <li>
            <code className="inline-code">POST /api/inference/predict</code> — 单条/批量向量推理
          </li>
          <li>部署页 — 模型版本、激活状态、Swagger 文档</li>
        </ul>
      </Panel>
    </div>
  );
}
