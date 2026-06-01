import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type ModelRecord } from '../api/client';
import { Panel, StatusBadge } from '../components/ui';
import { useAppContext } from '../context/AppContext';
import { listModelTypes } from '../model-types/registry';

export default function Overview() {
  const { trainDataset, trainJob, trainTraining, testResult } = useAppContext();

  const [models, setModels] = useState<ModelRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    api.listModels().then((res) => {
      setModels(res.models);
      setActiveId(res.active_model_id ?? null);
    }).catch(() => {});
    api.health().then(() => setBackendOk(true)).catch(() => setBackendOk(false));
  }, []);

  const activeModel = models.find((m) => m.id === activeId || m.is_active);
  const latestModel = models.length
    ? [...models].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0]
    : null;

  const availableCount = listModelTypes({ status: 'available' }).length;
  const upcomingCount = listModelTypes({ status: 'coming_soon' }).length;

  const headline = activeModel
    ? `推理在线 · ${activeModel.name}`
    : trainTraining
      ? '训练进行中'
      : models.length
        ? `共 ${models.length} 个模型，${activeModel ? '已部署' : '待部署'}`
        : '尚未创建模型';

  return (
    <div className="page-stack overview-page">
      <section className="overview-hero panel">
        <h2 className="page-lead">{headline}</h2>
        <p className="muted overview-hero-sub">
          {backendOk === false
            ? '后端服务离线，请检查 API 连接。'
            : '工业模型训练、评估与部署一览。'}
        </p>
      </section>

      <div className="overview-stats">
        <Link to="/pipeline" className="overview-stat overview-stat--accent">
          <span className="overview-stat-value">→</span>
          <span className="overview-stat-label">建模流水线</span>
        </Link>
        <Link to="/models" className="overview-stat">
          <span className="overview-stat-value">{models.length}</span>
          <span className="overview-stat-label">已保存模型</span>
        </Link>
        <Link to="/deploy" className="overview-stat">
          <span className="overview-stat-value">{activeModel ? '1' : '0'}</span>
          <span className="overview-stat-label">在线推理</span>
        </Link>
        <div className="overview-stat static">
          <span className="overview-stat-value">{availableCount}</span>
          <span className="overview-stat-label">可用算法</span>
        </div>
        <div className="overview-stat static">
          <span className="overview-stat-value">
            {trainTraining ? '…' : trainJob?.status === 'completed' ? '✓' : '—'}
          </span>
          <span className="overview-stat-label">本轮训练</span>
        </div>
      </div>

      <div className="overview-bottom">
        <Panel title="平台快照" className="overview-bottom-main">
          <dl className="overview-snapshot">
            <div>
              <dt>服务</dt>
              <dd>
                <StatusBadge
                  label={backendOk === false ? '离线' : backendOk ? '在线' : '检测中'}
                  tone={backendOk === false ? 'err' : backendOk ? 'ok' : 'muted'}
                />
              </dd>
            </div>
            <div>
              <dt>激活模型</dt>
              <dd>
                {activeModel ? (
                  <Link to={`/models/${activeModel.id}`} className="link">
                    {activeModel.name}
                  </Link>
                ) : (
                  '未设置'
                )}
              </dd>
            </div>
            <div>
              <dt>最新模型</dt>
              <dd>
                {latestModel ? (
                  <Link to={`/models/${latestModel.id}`} className="link">
                    {latestModel.name}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt>会话数据</dt>
              <dd>{trainDataset?.name ?? '未加载'}</dd>
            </div>
            <div>
              <dt>最近评估</dt>
              <dd>
                {testResult
                  ? `QE ${testResult.quantization_error.toFixed(3)}`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>算法规划</dt>
              <dd>{availableCount} 可用 · {upcomingCount} 即将推出</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="快捷入口" className="overview-bottom-side">
          <div className="overview-actions">
            <Link to="/pipeline" className="btn btn-primary full">
              打开建模流水线
            </Link>
            <Link to="/train" className="btn btn-secondary full">
              新建训练
            </Link>
            <Link to="/models" className="btn btn-secondary full">
              模型中心
            </Link>
            <Link to="/datasets" className="btn btn-secondary full">
              数据集
            </Link>
            <Link to="/evaluate" className="btn btn-secondary full">
              运行评估
            </Link>
            <Link to="/deploy" className="btn btn-secondary full">
              部署与推理
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
