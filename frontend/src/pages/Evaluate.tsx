import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type AnomalyRecord } from '../api/client';
import { useAppContext } from '../context/AppContext';
import AnomalyCharts from '../components/AnomalyCharts';
import AnomalyDetailModal from '../components/AnomalyDetailModal';
import DataUploader from '../components/DataUploader';
import { MetricLabel } from '../components/MetricHint';
import { ModelTypeBadge } from '../components/ModelTypeCard';
import { WorkflowStrip } from '../components/WorkflowStrip';
import { Field, Panel } from '../components/ui';

export default function Evaluate() {
  const [searchParams] = useSearchParams();
  const modelFromUrl = searchParams.get('model');

  const {
    testModelId,
    setTestModelId,
    testDataset,
    setTestDataset,
    testResult,
    setTestResult,
    testError,
    setTestError,
    testModels,
    setTestModels,
    clearTestSession,
  } = useAppContext();

  const [loading, setLoading] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyRecord | null>(null);

  const activeModel = testModels.find((m) => m.id === testModelId);

  const sameCellAnomalies = useMemo(() => {
    if (!selectedAnomaly || !testResult) return [];
    return testResult.anomalies
      .filter(
        (a) => a.bmu_x === selectedAnomaly.bmu_x && a.bmu_y === selectedAnomaly.bmu_y,
      )
      .sort((a, b) => b.quantization_error - a.quantization_error);
  }, [selectedAnomaly, testResult]);

  useEffect(() => {
    api.listModels().then((res) => {
      setTestModels(res.models);
      if (res.models.length) {
        setTestModelId((current) => {
          if (modelFromUrl && res.models.some((m) => m.id === modelFromUrl)) {
            return modelFromUrl;
          }
          const stillValid = res.models.some((m) => m.id === current);
          return stillValid && current ? current : res.models[0].id;
        });
      }
    });
  }, [setTestModelId, setTestModels, modelFromUrl]);

  const runEvaluation = async () => {
    if (!testModelId || !testDataset) {
      setTestError('请选择模型并上传测试数据集');
      return;
    }
    setLoading(true);
    setTestError(null);
    setSelectedAnomaly(null);
    try {
      const evalResult = await api.runEvaluation({
        model_id: testModelId,
        dataset_id: testDataset.id,
      });
      setTestResult(evalResult);
    } catch (e) {
      setTestError(e instanceof Error ? e.message : '评估失败');
    } finally {
      setLoading(false);
    }
  };

  const winnerCounts = testResult
    ? testResult.winners.reduce<Record<string, number>>((acc, [x, y]) => {
        const key = `${x},${y}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    : null;

  return (
    <div className="page-stack">
      <WorkflowStrip currentPath="/evaluate" />

      <Panel title="选择模型">
        <Field label="已训练模型">
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <select
              className="select"
              style={{ maxWidth: '28rem', flex: 1 }}
              value={testModelId}
              onChange={(e) => setTestModelId(e.target.value)}
            >
              {testModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — 量化误差 {m.metrics.quantization_error?.toFixed(4)}
                </option>
              ))}
            </select>
            {activeModel && <ModelTypeBadge modelTypeId="som" />}
          </div>
        </Field>
        {!testModels.length && (
          <p className="muted">
            暂无模型，请先在{' '}
            <Link to="/train" className="link">
              训练页
            </Link>{' '}
            创建。
          </p>
        )}
      </Panel>

      <DataUploader onUploaded={setTestDataset} />

      {testDataset && (
        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={runEvaluation}
          >
            {loading ? '评估中...' : '运行评估'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={clearTestSession}>
            清空评估页
          </button>
          {testResult && (
            <Link to="/deploy" className="btn btn-secondary">
              前往部署
            </Link>
          )}
        </div>
      )}

      {testError && <p className="text-error">{testError}</p>}

      {testResult && (
        <>
          <div className="grid-2">
            <Panel>
              <MetricLabel
                label="量化误差"
                hint="测试数据与地图上最匹配状态的差距；越大越不像训练时见过的正常工况。"
                detail="可理解为「这条数据在模型眼里有多别扭」。整体数值偏高时，说明本批测试与训练分布差异较大，需结合异常列表逐条核查。"
              />
              <p className="metric-value">{testResult.quantization_error.toFixed(4)}</p>
              <p className="muted">越低通常越好；单条样本的误差见下方异常表与散点图。</p>
            </Panel>
            <Panel>
              <MetricLabel
                label="拓扑误差"
                hint="相似的数据在地图上是否也落在相邻格子；反映地图结构是否连贯。"
                detail="若两条工艺数据很接近，但最佳匹配点却在地图上相距很远，就会拉高拓扑误差。数值越低，说明「相近工况 → 相近地图位置」越成立。"
              />
              <p className="metric-value">{testResult.topographic_error.toFixed(4)}</p>
              <p className="muted">越低通常越好；过高时地图分区可能不够平滑，可回看训练页热力图。</p>
            </Panel>
          </div>

          {testResult.anomaly_count > 0 ? (
            <Panel className="panel-warning">
              <h3 className="anomaly-section-title">
                可能异常的数据（{testResult.anomaly_count} 条）
              </h3>
              <p className="muted" style={{ marginBottom: 12 }}>
                依据：量化误差高于阈值
                {testResult.qe_threshold != null
                  ? ` ${testResult.qe_threshold.toFixed(3)}`
                  : ''}
                、落在稀少地图区域、或与次近状态不相邻。请结合现场工艺复核。
              </p>
              {testResult.samples?.length > 0 && (
                <AnomalyCharts
                  result={testResult}
                  onSelectAnomaly={setSelectedAnomaly}
                />
              )}
              <p className="muted" style={{ marginTop: 12 }}>
                点击表格行查看该条异常的全部字段与判定说明。
              </p>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>批次/行</th>
                      <th>量化误差</th>
                      <th>地图位置</th>
                      <th>标签</th>
                      <th>原因</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResult.anomalies.map((a) => (
                      <tr
                        key={a.row_index}
                        role="button"
                        tabIndex={0}
                        className={`clickable ${
                          selectedAnomaly?.row_index === a.row_index ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedAnomaly(a)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedAnomaly(a);
                          }
                        }}
                      >
                        <td>{a.row_id}</td>
                        <td>{a.quantization_error.toFixed(4)}</td>
                        <td>
                          ({a.bmu_x}, {a.bmu_y})
                        </td>
                        <td>{a.label ?? '—'}</td>
                        <td>{a.reasons.join('；')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : (
            testResult.anomalies && (
              <Panel>
                <p className="muted">未检出明显异常样本（仍请结合业务规则人工抽查）。</p>
              </Panel>
            )
          )}

          {winnerCounts && (
            <Panel title="获胜神经元分布">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>BMU 坐标 (x,y)</th>
                      <th>样本数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(winnerCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 20)
                      .map(([pos, count]) => (
                        <tr key={pos}>
                          <td>{pos}</td>
                          <td>{count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {testResult.labels_map && (
            <Panel title="标签分布图">
              <pre className="code-result">{JSON.stringify(testResult.labels_map, null, 2)}</pre>
            </Panel>
          )}
        </>
      )}

      {selectedAnomaly && (
        <AnomalyDetailModal
          anomaly={selectedAnomaly}
          featureColumns={activeModel?.feature_columns}
          qeThreshold={testResult?.qe_threshold}
          sameCellAnomalies={sameCellAnomalies}
          onSelectAnomaly={setSelectedAnomaly}
          onClose={() => setSelectedAnomaly(null)}
        />
      )}
    </div>
  );
}
