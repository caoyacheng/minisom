import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import DataUploader from '../components/DataUploader';
import { WorkflowStrip } from '../components/WorkflowStrip';
import { Field, Panel } from '../components/ui';
import { labelField } from '../utils/fieldLabels';

export default function Datasets() {
  const {
    trainDataset,
    onTrainUploaded,
    testDataset,
    setTestDataset,
    clearTrainSession,
    clearTestSession,
  } = useAppContext();

  const sessions = [
    trainDataset
      ? {
          role: '训练',
          dataset: trainDataset,
          onClear: clearTrainSession,
          trainLink: '/train',
        }
      : null,
    testDataset
      ? {
          role: '评估',
          dataset: testDataset,
          onClear: clearTestSession,
          trainLink: '/evaluate',
        }
      : null,
  ].filter(Boolean) as {
    role: string;
    dataset: NonNullable<typeof trainDataset>;
    onClear: () => void;
    trainLink: string;
  }[];

  return (
    <div className="page-stack">
      <WorkflowStrip currentPath="/datasets" />

      <Panel>
        <h2 className="page-lead" style={{ marginBottom: 4 }}>
          数据集
        </h2>
        <p className="muted">
          当前会话中的 CSV 数据。后续版本将支持数据库、时序库与 OPC-UA 接入。
        </p>
      </Panel>

      <Panel title="上传新数据集">
        <p className="muted" style={{ marginBottom: 12 }}>
          上传后将写入训练会话；也可在评估页单独上传测试集。
        </p>
        <DataUploader onUploaded={onTrainUploaded} />
      </Panel>

      <Panel title="当前会话">
        {sessions.length === 0 ? (
          <p className="muted">暂无已加载的数据集。请先上传 CSV。</p>
        ) : (
          <div className="page-stack">
            {sessions.map(({ role, dataset, onClear, trainLink }) => (
              <div key={`${role}-${dataset.id}`} className="sub-panel">
                <div className="panel-header-row">
                  <div>
                    <strong>{role}数据集</strong>
                    <p className="muted" style={{ marginTop: 2 }}>
                      {dataset.name} · {dataset.rows} 行 · {dataset.columns.length} 列
                    </p>
                  </div>
                  <div className="row">
                    <Link to={trainLink} className="btn btn-secondary btn-sm">
                      前往{role}
                    </Link>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
                      清除
                    </button>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        {dataset.columns.slice(0, 6).map((c) => (
                          <th key={c}>{labelField(c)}</th>
                        ))}
                        {dataset.columns.length > 6 && <th>…</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {dataset.preview.slice(0, 3).map((row, i) => (
                        <tr key={i}>
                          {dataset.columns.slice(0, 6).map((c) => (
                            <td key={c}>{String(row[c] ?? '')}</td>
                          ))}
                          {dataset.columns.length > 6 && <td>…</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="数据要求（按算法）">
        <dl className="kv-grid">
          <dt>SOM</dt>
          <dd>数值特征列；可选标签列</dd>
          <dt>孤立森林</dt>
          <dd>数值特征列；无标签（规划中）</dd>
          <dt>梯度提升分类</dt>
          <dd>特征列 + 类别标签（规划中）</dd>
        </dl>
      </Panel>

      <Panel title="评估专用上传">
        <Field label="测试集（不影响训练会话）">
          <DataUploader onUploaded={setTestDataset} />
        </Field>
      </Panel>
    </div>
  );
}
