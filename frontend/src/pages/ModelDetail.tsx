import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type ModelRecord } from '../api/client';
import { ModelTypeBadge } from '../components/ModelTypeCard';
import { Tabs } from '../components/Tabs';
import { Panel, StatusBadge } from '../components/ui';
import { getModelType } from '../model-types/registry';
import { TASK_LABELS } from '../model-types/types';
import { labelField } from '../utils/fieldLabels';
import { buildModelCardText, modelTypeIdOf } from '../utils/modelFilters';

export default function ModelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [model, setModel] = useState<ModelRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const m = await api.getModel(id);
      setModel(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onActivate = async () => {
    if (!model) return;
    await api.activateModel(model.id);
    load();
  };

  const onDelete = async () => {
    if (!model) return;
    if (!confirm(`确定删除模型「${model.name}」？`)) return;
    await api.deleteModel(model.id);
    navigate('/models');
  };

  const copyCard = async () => {
    if (!model) return;
    await navigator.clipboard.writeText(buildModelCardText(model));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Panel>
        <p className="muted">加载模型…</p>
      </Panel>
    );
  }

  if (error || !model) {
    return (
      <Panel>
        <p className="text-error">{error ?? '模型不存在'}</p>
        <Link to="/models" className="btn btn-secondary" style={{ marginTop: 12 }}>
          返回模型中心
        </Link>
      </Panel>
    );
  }

  const typeId = modelTypeIdOf(model);
  const def = getModelType(typeId);
  const cardText = buildModelCardText(model);
  const hp = model.hyperparameters;

  const predictSnippet = `curl -X POST http://localhost:8000/api/inference/predict \\
  -H "Content-Type: application/json" \\
  -d '{"model_id": "${model.id}", "samples": [[${model.feature_columns.map(() => '0.0').join(', ')}]]}'`;

  return (
    <div className="page-stack">
      <Panel>
        <div className="panel-header-row">
          <div>
            <div className="row" style={{ flexWrap: 'wrap', marginBottom: 6 }}>
              <h2 className="page-lead" style={{ margin: 0 }}>
                {model.name}
              </h2>
              <ModelTypeBadge modelTypeId={typeId} />
              {def && <StatusBadge label={TASK_LABELS[def.task]} tone="muted" />}
              {model.is_active && <StatusBadge label="已激活" tone="ok" />}
            </div>
            <p className="muted">{model.id}</p>
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={onActivate}>
              设为推理模型
            </button>
            <Link
              to={`/evaluate?model=${model.id}`}
              className="btn btn-secondary btn-sm"
            >
              运行评估
            </Link>
            <a
              className="btn btn-secondary btn-sm"
              href={api.downloadModelUrl(model.id)}
              download
            >
              下载 .pkl
            </a>
            <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
              删除
            </button>
          </div>
        </div>
      </Panel>

      <Panel>
        <Tabs
          defaultId="overview"
          items={[
            {
              id: 'overview',
              label: 'Model Card',
              content: (
                <div className="page-stack">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <p className="muted" style={{ margin: 0 }}>
                      工业模型说明书，可复制交付或存档。
                    </p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={copyCard}>
                      {copied ? '已复制' : '复制 Card'}
                    </button>
                  </div>
                  <pre className="model-card-pre">{cardText}</pre>
                  <h3 className="section-heading">血缘 (Lineage)</h3>
                  <dl className="kv-grid">
                    <dt>训练数据集</dt>
                    <dd>
                      <Link to="/datasets" className="link">
                        {model.dataset_id}
                      </Link>
                    </dd>
                    <dt>特征列</dt>
                    <dd>{model.feature_columns.map(labelField).join(' · ')}</dd>
                    <dt>创建时间</dt>
                    <dd>{new Date(model.created_at).toLocaleString('zh-CN')}</dd>
                  </dl>
                </div>
              ),
            },
            {
              id: 'config',
              label: '训练配置',
              content: (
                <div className="page-stack">
                  <dl className="kv-grid">
                    <dt>网格</dt>
                    <dd>
                      {String(hp.grid_x ?? '—')}×{String(hp.grid_y ?? '—')}
                    </dd>
                    <dt>迭代次数</dt>
                    <dd>{String(hp.num_iterations ?? '—')}</dd>
                    <dt>学习率</dt>
                    <dd>{String(hp.learning_rate ?? '—')}</dd>
                    <dt>邻域 σ</dt>
                    <dd>{String(hp.sigma ?? '—')}</dd>
                    <dt>拓扑</dt>
                    <dd>{String(hp.topology ?? '—')}</dd>
                    <dt>归一化</dt>
                    <dd>{model.normalize ? '是' : '否'}</dd>
                  </dl>
                  <h3 className="section-heading">完整 hyperparameters</h3>
                  <pre className="code-result">
                    {JSON.stringify(hp, null, 2)}
                  </pre>
                </div>
              ),
            },
            {
              id: 'metrics',
              label: '指标',
              content: (
                <div className="grid-2">
                  <div className="metric-hero">
                    <span className="metric-label">量化误差 (QE)</span>
                    <span className="metric-value">
                      {model.metrics.quantization_error?.toFixed(4) ?? '—'}
                    </span>
                    <p className="muted">越低通常表示训练集拟合越好</p>
                  </div>
                  <div className="metric-hero">
                    <span className="metric-label">拓扑误差 (TE)</span>
                    <span className="metric-value">
                      {model.metrics.topographic_error?.toFixed(4) ?? '—'}
                    </span>
                    <p className="muted">越低表示地图结构越连贯</p>
                  </div>
                </div>
              ),
            },
            {
              id: 'inference',
              label: '推理 API',
              content: (
                <div className="page-stack">
                  <p className="muted">
                    与{' '}
                    <a href="/docs" className="link" target="_blank" rel="noreferrer">
                      Swagger
                    </a>{' '}
                    一致；也可在{' '}
                    <Link to="/deploy" className="link">
                      部署页
                    </Link>{' '}
                    试跑。
                  </p>
                  <pre className="code-block">{predictSnippet}</pre>
                  <p className="muted">
                    特征维度：{model.feature_columns.length}（
                    {model.feature_columns.map(labelField).join(', ')}）
                  </p>
                </div>
              ),
            },
            {
              id: 'files',
              label: '文件',
              content: (
                <div className="page-stack">
                  <dl className="kv-grid">
                    <dt>产物格式</dt>
                    <dd>pickle (.pkl)</dd>
                    <dt>文件名</dt>
                    <dd>{model.id}.pkl</dd>
                    <dt>下载</dt>
                    <dd>
                      <a href={api.downloadModelUrl(model.id)} className="link" download>
                        /api/models/{model.id}/download
                      </a>
                    </dd>
                  </dl>
                  <p className="muted">
                    仅加载本系统生成的模型文件；生产环境建议使用版本化存储与签名校验。
                  </p>
                </div>
              ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}
