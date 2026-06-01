import { useEffect, useState } from 'react';
import { api } from '../../../api/client';
import { useAppContext } from '../../../context/AppContext';
import { PipelineCsvUpload } from '../PipelineCsvUpload';

export function EvaluateNodeConfig() {
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
    trainJob,
  } = useAppContext();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listModels().then((res) => {
      setTestModels(res.models);
      if (res.models.length && !testModelId) {
        const active = res.active_model_id ?? res.models.find((m) => m.is_active)?.id;
        setTestModelId(active ?? res.models[0].id);
      }
    }).catch(() => {});
  }, [setTestModels, setTestModelId, testModelId]);

  useEffect(() => {
    if (trainJob?.model_id && testModels.some((m) => m.id === trainJob.model_id)) {
      setTestModelId(trainJob.model_id);
    }
  }, [trainJob?.model_id, testModels, setTestModelId]);

  const runEvaluation = async () => {
    if (!testModelId || !testDataset) {
      setTestError('请选择模型与测试数据集');
      return;
    }
    setLoading(true);
    setTestError(null);
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

  const onTestUploaded = (dataset: { id: string; name: string }) => {
    setTestDataset(dataset as import('../../../api/client').DatasetPreview);
  };

  return (
    <div className="pipeline-node-config nodrag nopan">
      <label className="pipeline-node-field">
        <span>评估模型</span>
        <select
          className="pipeline-node-input"
          value={testModelId}
          onChange={(e) => setTestModelId(e.target.value)}
          disabled={!testModels.length}
        >
          {!testModels.length && <option value="">暂无模型</option>}
          {testModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <PipelineCsvUpload onUploaded={onTestUploaded} label="上传测试集" />
      {testDataset && (
        <p className="pipeline-node-meta">测试集：{testDataset.name}</p>
      )}
      <button
        type="button"
        className="btn btn-primary btn-sm pipeline-node-action"
        disabled={loading || !testModels.length}
        onClick={runEvaluation}
      >
        {loading ? '评估中…' : '运行评估'}
      </button>
      {testError && <p className="pipeline-node-error">{testError}</p>}
      {testResult && (
        <p className="pipeline-node-meta">
          QE {testResult.quantization_error.toFixed(3)} · 异常{' '}
          {testResult.anomaly_count}
        </p>
      )}
    </div>
  );
}
