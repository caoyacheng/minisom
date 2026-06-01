import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { ModelRecord } from '../api/client';
import ModelCard from '../components/ModelCard';
import { WorkflowStrip } from '../components/WorkflowStrip';
import { Field, Panel } from '../components/ui';

export default function Deploy() {
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [predictInput, setPredictInput] = useState('0.1, 0.2, 0.3, 0.4');
  const [predictResult, setPredictResult] = useState<string | null>(null);
  const [predictFile, setPredictFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await api.listModels();
    setModels(res.models);
    setActiveId(res.active_model_id ?? null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onActivate = async (id: string) => {
    await api.activateModel(id);
    refresh();
  };

  const onDelete = async (id: string) => {
    if (!confirm('确定删除该模型？')) return;
    await api.deleteModel(id);
    refresh();
  };

  const runPredict = async () => {
    setError(null);
    try {
      const samples = [
        predictInput.split(',').map((v) => parseFloat(v.trim())),
      ];
      const res = await api.predict(samples);
      setPredictResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : '推理失败');
    }
  };

  const runPredictFile = async () => {
    if (!predictFile) return;
    setError(null);
    try {
      const res = await api.predictFile(predictFile);
      const blob = new Blob([res.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'predictions.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : '批量推理失败');
    }
  };

  return (
    <div className="page-stack">
      <WorkflowStrip currentPath="/deploy" />

      <Panel title="模型版本管理">
        <p className="muted">
          跨算法模型的推理发布。完整列表见{' '}
          <Link to="/models" className="link">
            模型中心
          </Link>
          。
        </p>
        <p className="muted" style={{ marginTop: 8 }}>
          当前激活模型:{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{activeId ?? '未设置'}</strong>
        </p>
      </Panel>

      <div className="grid-2">
        {models.map((m) => (
          <ModelCard
            key={m.id}
            model={m}
            onActivate={onActivate}
            onDelete={onDelete}
          />
        ))}
        {!models.length && <p className="muted">暂无已保存模型。</p>}
      </div>

      <Panel title="在线推理接口">
        <p className="muted">
          接口文档：{' '}
          <a href="/docs" className="link" target="_blank" rel="noreferrer">
            打开 Swagger
          </a>
        </p>
        <pre className="code-block">{`curl -X POST http://localhost:8000/api/inference/predict \\
  -H "Content-Type: application/json" \\
  -d '{"samples": [[0.1, 0.2, 0.3, 0.4]]}'`}</pre>

        <Field label="单条推理（逗号分隔特征值）">
          <input
            className="input"
            value={predictInput}
            onChange={(e) => setPredictInput(e.target.value)}
          />
          <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} onClick={runPredict}>
            运行推理
          </button>
        </Field>

        {predictResult && <pre className="code-result">{predictResult}</pre>}

        <Field label="批量推理（CSV 文件）">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setPredictFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 8 }}
            disabled={!predictFile}
            onClick={runPredictFile}
          >
            上传并下载结果
          </button>
        </Field>

        {error && <p className="text-error">{error}</p>}
      </Panel>

      <Panel title="Docker 部署">
        <pre className="code-block">{`docker compose up --build`}</pre>
        <p className="muted" style={{ marginTop: 8 }}>
          启动后访问 http://localhost:8000
        </p>
      </Panel>
    </div>
  );
}
