import { useEffect, useState } from 'react';
import { api } from '../../../api/client';

export function MonitorNodeConfig() {
  const [health, setHealth] = useState<{
    status: string;
    active_model_id?: string;
  } | null>(null);
  const [predictInput, setPredictInput] = useState('0.1, 0.2, 0.3, 0.4');
  const [predictOut, setPredictOut] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, [predictOut]);

  const runPredict = async () => {
    setError(null);
    setPredictOut(null);
    try {
      const samples = [predictInput.split(',').map((v) => parseFloat(v.trim()))];
      const res = await api.predict(samples);
      setPredictOut(`BMU (${res.winners[0][0]}, ${res.winners[0][1]})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '推理失败');
    }
  };

  return (
    <div className="pipeline-node-config nodrag nopan">
      <p className="pipeline-node-meta">
        服务：{health?.status === 'ok' ? '在线' : '—'}
      </p>
      <p className="pipeline-node-meta">
        激活模型：{health?.active_model_id?.slice(0, 8) ?? '未设置'}
        {health?.active_model_id ? '…' : ''}
      </p>
      <label className="pipeline-node-field">
        <span>试推理（逗号分隔）</span>
        <input
          className="pipeline-node-input"
          value={predictInput}
          onChange={(e) => setPredictInput(e.target.value)}
          placeholder="0.1, 0.2, …"
        />
      </label>
      <button
        type="button"
        className="btn btn-secondary btn-sm pipeline-node-action"
        onClick={runPredict}
        disabled={!health?.active_model_id}
      >
        试跑推理
      </button>
      {predictOut && <p className="pipeline-node-meta">{predictOut}</p>}
      {error && <p className="pipeline-node-error">{error}</p>}
      <p className="pipeline-node-hint">完整监控能力规划中</p>
    </div>
  );
}
