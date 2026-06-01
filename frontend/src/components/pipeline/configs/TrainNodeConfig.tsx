import { useEffect } from 'react';
import { api } from '../../../api/client';
import { useAppContext, defaultTrainingConfig } from '../../../context/AppContext';
import TrainingProgress from '../../TrainingProgress';

export function TrainNodeConfig() {
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
  } = useAppContext();

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
        } else if (updated.status === 'failed') {
          setTrainTraining(false);
          setTrainError(updated.error ?? '训练失败');
        }
      } catch {
        /* ignore poll errors */
      }
    }, 800);
    return () => clearInterval(timer);
  }, [trainJob, setTrainJob, setTrainTraining, setTrainError, setTrainViz]);

  const startTraining = async () => {
    if (!trainConfig || !trainDataset) {
      setTrainError('请先在「准备数据」节点选择数据集');
      return;
    }
    if (!trainConfig.feature_columns.length) {
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
    if (trainDataset && !trainConfig) {
      const features = trainDataset.numeric_columns.length
        ? trainDataset.numeric_columns
        : trainDataset.columns;
      setTrainConfig(defaultTrainingConfig(trainDataset.id, features));
    }
  }, [trainDataset, trainConfig, setTrainConfig]);

  if (!trainDataset) {
    return (
      <p className="pipeline-node-hint nodrag nopan">请先在「准备数据」节点配置数据集</p>
    );
  }

  if (!trainConfig) return null;

  const features = trainDataset.numeric_columns.length
    ? trainDataset.numeric_columns
    : trainDataset.columns;

  const toggleFeature = (col: string) => {
    setTrainConfig((c) => {
      if (!c) return c;
      const set = new Set(c.feature_columns);
      if (set.has(col)) set.delete(col);
      else set.add(col);
      return { ...c, feature_columns: [...set] };
    });
  };

  return (
    <div className="pipeline-node-config nodrag nopan">
      <label className="pipeline-node-field">
        <span>模型名称</span>
        <input
          className="pipeline-node-input"
          value={trainConfig.model_name}
          onChange={(e) =>
            setTrainConfig((c) => (c ? { ...c, model_name: e.target.value } : c))
          }
        />
      </label>
      <div className="pipeline-node-row">
        <label className="pipeline-node-field">
          <span>网格 X</span>
          <input
            type="number"
            className="pipeline-node-input"
            min={1}
            max={100}
            value={trainConfig.grid_x}
            onChange={(e) =>
              setTrainConfig((c) =>
                c ? { ...c, grid_x: Number(e.target.value) } : c,
              )
            }
          />
        </label>
        <label className="pipeline-node-field">
          <span>网格 Y</span>
          <input
            type="number"
            className="pipeline-node-input"
            min={1}
            max={100}
            value={trainConfig.grid_y}
            onChange={(e) =>
              setTrainConfig((c) =>
                c ? { ...c, grid_y: Number(e.target.value) } : c,
              )
            }
          />
        </label>
      </div>
      <label className="pipeline-node-field">
        <span>迭代次数</span>
        <input
          type="number"
          className="pipeline-node-input"
          min={1}
          value={trainConfig.num_iterations}
          onChange={(e) =>
            setTrainConfig((c) =>
              c ? { ...c, num_iterations: Number(e.target.value) } : c,
            )
          }
        />
      </label>
      <div className="pipeline-node-field">
        <span>特征列</span>
        <div className="pipeline-node-chips">
          {features.slice(0, 8).map((col) => (
            <button
              key={col}
              type="button"
              className={`pipeline-node-chip ${
                trainConfig.feature_columns.includes(col) ? 'on' : ''
              }`}
              onClick={() => toggleFeature(col)}
            >
              {col}
            </button>
          ))}
          {features.length > 8 && (
            <span className="pipeline-node-meta">+{features.length - 8} 列</span>
          )}
        </div>
      </div>
      <label className="pipeline-node-check">
        <input
          type="checkbox"
          checked={trainConfig.normalize}
          onChange={(e) =>
            setTrainConfig((c) => (c ? { ...c, normalize: e.target.checked } : c))
          }
        />
        归一化
      </label>
      <button
        type="button"
        className="btn btn-primary btn-sm pipeline-node-action"
        disabled={trainTraining}
        onClick={startTraining}
      >
        {trainTraining ? '训练中…' : '开始训练'}
      </button>
      {trainError && <p className="pipeline-node-error">{trainError}</p>}
      {trainJob && (
        <div className="pipeline-node-progress">
          <TrainingProgress job={trainJob} compact />
        </div>
      )}
      {trainViz && trainJob?.status === 'completed' && (
        <p className="pipeline-node-meta">训练完成，模型已保存</p>
      )}
    </div>
  );
}
