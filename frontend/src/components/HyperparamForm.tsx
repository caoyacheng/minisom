import type { DatasetPreview, TrainingConfig } from '../api/client';
import {
  activationDistanceHint,
  activationDistanceLabel,
  neighborhoodLabel,
  topologyLabel,
  trainingModeLabel,
  weightInitLabel,
} from '../utils/labels';
import { labelField } from '../utils/fieldLabels';
import { Field, Panel } from './ui';

interface Props {
  dataset: DatasetPreview;
  config: TrainingConfig;
  onChange: (config: TrainingConfig) => void;
  onSuggestGrid: () => void;
}

export default function HyperparamForm({
  dataset,
  config,
  onChange,
  onSuggestGrid,
}: Props) {
  const set = <K extends keyof TrainingConfig>(key: K, value: TrainingConfig[K]) =>
    onChange({ ...config, [key]: value });

  const toggleFeature = (col: string) => {
    const cols = config.feature_columns.includes(col)
      ? config.feature_columns.filter((c) => c !== col)
      : [...config.feature_columns, col];
    set('feature_columns', cols);
  };

  return (
    <Panel>
      <div className="panel-header-row">
        <h2 className="panel-title">超参数配置</h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onSuggestGrid}>
          推荐网格 (5×√N)
        </button>
      </div>

      <Field label="模型名称">
        <input
          className="input"
          value={config.model_name}
          onChange={(e) => set('model_name', e.target.value)}
        />
      </Field>

      <Field label="特征列">
        <div className="chip-row">
          {dataset.numeric_columns.map((col) => (
            <label
              key={col}
              className={`chip ${config.feature_columns.includes(col) ? 'active' : ''}`}
            >
              <input
                type="checkbox"
                checked={config.feature_columns.includes(col)}
                onChange={() => toggleFeature(col)}
              />
              {labelField(col)}
            </label>
          ))}
        </div>
      </Field>

      <Field label="标签列（可选）">
        <select
          className="select"
          value={config.label_column || ''}
          onChange={(e) => set('label_column', e.target.value || null)}
        >
          <option value="">无</option>
          {dataset.columns.map((col) => (
            <option key={col} value={col}>
              {labelField(col)}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid-4">
        <Field label="网格 X">
          <input
            type="number"
            className="input"
            min={1}
            value={config.grid_x}
            onChange={(e) => set('grid_x', Number(e.target.value))}
          />
        </Field>
        <Field label="网格 Y">
          <input
            type="number"
            className="input"
            min={1}
            value={config.grid_y}
            onChange={(e) => set('grid_y', Number(e.target.value))}
          />
        </Field>
        <Field label="邻域半径 (Sigma)">
          <input
            type="number"
            step="0.1"
            className="input"
            value={config.sigma}
            onChange={(e) => set('sigma', Number(e.target.value))}
          />
        </Field>
        <Field label="学习率">
          <input
            type="number"
            step="0.05"
            className="input"
            value={config.learning_rate}
            onChange={(e) => set('learning_rate', Number(e.target.value))}
          />
        </Field>
        <Field label="迭代次数">
          <input
            type="number"
            className="input"
            min={1}
            value={config.num_iterations}
            onChange={(e) => set('num_iterations', Number(e.target.value))}
          />
        </Field>
        <Field label="拓扑结构">
          <select
            className="select"
            value={config.topology}
            onChange={(e) =>
              set('topology', e.target.value as TrainingConfig['topology'])
            }
          >
            {(Object.keys(topologyLabel) as TrainingConfig['topology'][]).map(
              (key) => (
                <option key={key} value={key}>
                  {topologyLabel[key]}
                </option>
              ),
            )}
          </select>
        </Field>
        <Field label="邻域函数">
          <select
            className="select"
            value={config.neighborhood_function}
            onChange={(e) =>
              set(
                'neighborhood_function',
                e.target.value as TrainingConfig['neighborhood_function'],
              )
            }
          >
            {(
              Object.keys(neighborhoodLabel) as TrainingConfig['neighborhood_function'][]
            ).map((key) => (
              <option key={key} value={key}>
                {neighborhoodLabel[key]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="训练模式">
          <select
            className="select"
            value={config.training_mode}
            onChange={(e) =>
              set('training_mode', e.target.value as TrainingConfig['training_mode'])
            }
          >
            {(
              Object.keys(trainingModeLabel) as TrainingConfig['training_mode'][]
            ).map((key) => (
              <option key={key} value={key}>
                {trainingModeLabel[key]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="checkbox-row">
        <label>
          <input
            type="checkbox"
            checked={config.normalize}
            onChange={(e) => set('normalize', e.target.checked)}
          />
          归一化数据
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.random_order}
            onChange={(e) => set('random_order', e.target.checked)}
          />
          随机采样顺序
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.use_epochs}
            onChange={(e) => set('use_epochs', e.target.checked)}
          />
          按轮次 (Epoch) 训练
        </label>
        <label>
          <span>权重初始化：</span>
          <select
            className="select"
            style={{ width: 'auto', display: 'inline-block' }}
            value={config.weight_init}
            onChange={(e) =>
              set('weight_init', e.target.value as TrainingConfig['weight_init'])
            }
          >
            {(
              Object.keys(weightInitLabel) as TrainingConfig['weight_init'][]
            ).map((key) => (
              <option key={key} value={key}>
                {weightInitLabel[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <details className="details-panel" style={{ marginTop: 16 }}>
        <summary>高级设置</summary>
        <div style={{ marginTop: 16 }}>
          <Field label="激活距离">
            <select
              className="select"
              style={{ maxWidth: '28rem' }}
              value={config.activation_distance}
              onChange={(e) =>
                set(
                  'activation_distance',
                  e.target.value as TrainingConfig['activation_distance'],
                )
              }
            >
              {(
                Object.keys(
                  activationDistanceLabel,
                ) as TrainingConfig['activation_distance'][]
              ).map((key) => (
                <option key={key} value={key}>
                  {activationDistanceLabel[key]}
                </option>
              ))}
            </select>
          </Field>
          <p className="muted">{activationDistanceHint[config.activation_distance]}</p>
        </div>
      </details>
    </Panel>
  );
}
