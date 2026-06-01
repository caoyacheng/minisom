import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAppContext } from '../context/AppContext';
import DataUploader from '../components/DataUploader';
import HeatmapChart from '../components/HeatmapChart';
import HyperparamForm from '../components/HyperparamForm';
import { ModelTypeCard } from '../components/ModelTypeCard';
import TrainingProgress from '../components/TrainingProgress';
import { WorkflowStrip } from '../components/WorkflowStrip';
import { Panel } from '../components/ui';
import {
  DEFAULT_MODEL_TYPE_ID,
  getModelType,
  listModelTypes,
} from '../model-types/registry';
import { labelField } from '../utils/fieldLabels';

export default function Train() {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('type') ?? DEFAULT_MODEL_TYPE_ID;
  const selectedType = getModelType(typeParam) ?? getModelType(DEFAULT_MODEL_TYPE_ID)!;

  const {
    trainDataset,
    trainConfig,
    setTrainConfig,
    trainJob,
    setTrainJob,
    trainViz,
    setTrainViz,
    trainTraining,
    setTrainTraining,
    trainError,
    setTrainError,
    onTrainUploaded,
    clearTrainSession,
  } = useAppContext();

  const selectType = (id: string) => {
    setSearchParams({ type: id }, { replace: true });
  };

  const onSuggestGrid = async () => {
    if (!trainDataset) return;
    const suggested = await api.suggestGrid(trainDataset.id);
    setTrainConfig((c) =>
      c ? { ...c, grid_x: suggested.grid_x, grid_y: suggested.grid_y } : c,
    );
  };

  const startTraining = async () => {
    if (selectedType.status !== 'available') return;
    if (!trainConfig || !trainConfig.feature_columns.length) {
      setTrainError('请至少选择一个特征列');
      return;
    }
    setTrainTraining(true);
    setTrainError(null);
    setTrainViz(null);
    try {
      const status = await api.startTraining(trainConfig);
      setTrainJob(status);
    } catch (e) {
      setTrainError(e instanceof Error ? e.message : '启动训练失败');
      setTrainTraining(false);
    }
  };

  useEffect(() => {
    if (!trainJob || trainJob.status === 'completed' || trainJob.status === 'failed') {
      return;
    }
    const timer = setInterval(async () => {
      try {
        const updated = await api.getJob(trainJob.job_id);
        setTrainJob(updated);
        if (updated.status === 'completed') {
          setTrainTraining(false);
          const visualizations = await api.getVisualizations(updated.job_id);
          setTrainViz(visualizations);
        }
        if (updated.status === 'failed') setTrainTraining(false);
      } catch {
        /* ignore poll errors */
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [trainJob, setTrainJob, setTrainTraining, setTrainViz]);

  const somReady = selectedType.id === 'som' && selectedType.status === 'available';

  return (
    <div className="page-stack">
      <WorkflowStrip currentPath="/train" />

      <Panel title="选择算法类型">
        <div className="model-type-grid compact">
          {listModelTypes().map((t) => (
            <ModelTypeCard
              key={t.id}
              modelType={t}
              compact
              selected={t.id === selectedType.id}
              onSelect={selectType}
            />
          ))}
        </div>
      </Panel>

      {selectedType.status === 'coming_soon' && (
        <Panel>
          <p className="muted">
            <strong>{selectedType.label}</strong> 的后端训练插件尚未接入。
            平台 IA 已预留入口，接入后此处将自动启用训练表单。
          </p>
          <Link to="/" className="btn btn-secondary" style={{ marginTop: 12 }}>
            返回总览
          </Link>
        </Panel>
      )}

      {somReady && (
        <>
          <DataUploader onUploaded={onTrainUploaded} />

          {trainDataset && trainConfig && (
            <>
              <Panel>
                <div className="panel-header-row">
                  <h2 className="panel-title">
                    数据预览 — {trainDataset.name} ({trainDataset.rows} 行)
                  </h2>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={clearTrainSession}
                  >
                    清空训练页
                  </button>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        {trainDataset.columns.map((c) => (
                          <th key={c}>{labelField(c)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trainDataset.preview.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          {trainDataset.columns.map((c) => (
                            <td key={c}>{String(row[c] ?? '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <HyperparamForm
                dataset={trainDataset}
                config={trainConfig}
                onChange={setTrainConfig}
                onSuggestGrid={onSuggestGrid}
              />

              <div className="row">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={trainTraining}
                  onClick={startTraining}
                >
                  {trainTraining ? '训练中...' : '开始训练'}
                </button>
                {trainJob?.status === 'completed' && trainJob.model_id && (
                  <>
                    <Link
                      to={`/models/${trainJob.model_id}`}
                      className="btn btn-secondary"
                    >
                      查看 Model Card
                    </Link>
                    <Link
                      to={`/evaluate?model=${trainJob.model_id}`}
                      className="btn btn-secondary"
                    >
                      前往评估
                    </Link>
                  </>
                )}
              </div>

              {trainError && <p className="text-error">{trainError}</p>}
              <TrainingProgress job={trainJob} />

              {trainViz && (
                <div className="grid-2">
                  <HeatmapChart title="U-Matrix 距离图" data={trainViz.u_matrix} />
                  <HeatmapChart title="激活响应图" data={trainViz.activation_response} />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
