import { useCallback, useEffect, useState } from 'react';
import { api, type ModelRecord } from '../../../api/client';

export function DeployNodeConfig() {
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await api.listModels();
    setModels(res.models);
    const active = res.active_model_id ?? res.models.find((m) => m.is_active)?.id ?? null;
    setActiveId(active);
    setSelectedId((prev) => {
      if (prev && res.models.some((m) => m.id === prev)) return prev;
      return active ?? res.models[0]?.id ?? '';
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activate = async () => {
    if (!selectedId) {
      setError('请选择要部署的模型');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const record = await api.activateModel(selectedId);
      setMessage(`已激活：${record.name}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '激活失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pipeline-node-config nodrag nopan">
      <label className="pipeline-node-field">
        <span>部署模型</span>
        <select
          className="pipeline-node-input"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={!models.length}
        >
          {!models.length && <option value="">暂无模型</option>}
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.id === activeId ? '（在线）' : ''}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="btn btn-primary btn-sm pipeline-node-action"
        disabled={loading || !models.length}
        onClick={activate}
      >
        {loading ? '处理中…' : '设为在线模型'}
      </button>
      {message && <p className="pipeline-node-meta pipeline-node-success">{message}</p>}
      {error && <p className="pipeline-node-error">{error}</p>}
      {activeId && !message && (
        <p className="pipeline-node-meta">
          当前在线：{models.find((m) => m.id === activeId)?.name ?? activeId}
        </p>
      )}
    </div>
  );
}
