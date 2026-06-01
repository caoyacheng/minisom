import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type ModelRecord } from '../api/client';
import ModelListItem from '../components/ModelListItem';
import { Panel } from '../components/ui';
import { listModelTypes } from '../model-types/registry';
import { TASK_LABELS, type ModelTask } from '../model-types/types';
import {
  filterAndSortModels,
  SORT_LABELS,
  type SortKey,
} from '../utils/modelFilters';

export default function Models() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const task = (searchParams.get('task') as ModelTask | 'all') || 'all';
  const type = searchParams.get('type') ?? 'all';
  const sort = (searchParams.get('sort') as SortKey) || 'created_desc';
  const activeOnly = searchParams.get('active') === '1';

  const [models, setModels] = useState<ModelRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listModels()
      .then((res) => {
        setModels(res.models);
        setActiveId(res.active_model_id ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const modelTypes = listModelTypes();

  const filtered = useMemo(
    () => filterAndSortModels(models, { q, task, type, sort, activeOnly }),
    [models, q, task, type, sort, activeOnly],
  );

  const hasFilters =
    q !== '' || task !== 'all' || type !== 'all' || sort !== 'created_desc' || activeOnly;

  const setFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value == null || value === '' || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="page-stack">
      <div className="models-toolbar">
        <select
          className="select models-toolbar-select"
          aria-label="任务类型"
          value={task}
          onChange={(e) =>
            setFilter('task', e.target.value === 'all' ? null : e.target.value)
          }
        >
          <option value="all">全部任务</option>
          {(Object.keys(TASK_LABELS) as ModelTask[]).map((t) => (
            <option key={t} value={t}>
              {TASK_LABELS[t]}
            </option>
          ))}
        </select>

        <select
          className="select models-toolbar-select"
          aria-label="算法"
          value={type}
          onChange={(e) =>
            setFilter('type', e.target.value === 'all' ? null : e.target.value)
          }
        >
          <option value="all">全部算法</option>
          {modelTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.shortLabel}
            </option>
          ))}
        </select>

        <select
          className="select models-toolbar-select"
          aria-label="排序"
          value={sort}
          onChange={(e) => setFilter('sort', e.target.value)}
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABELS[k]}
            </option>
          ))}
        </select>

        <button
          type="button"
          className={`models-toolbar-chip ${activeOnly ? 'active' : ''}`}
          onClick={() => setFilter('active', activeOnly ? null : '1')}
        >
          已激活
        </button>

        {!loading && (
          <span className="models-toolbar-count muted">
            {filtered.length}/{models.length}
          </span>
        )}

        <div className="models-toolbar-spacer" />

        {hasFilters && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
            清除
          </button>
        )}
        <Link to="/train" className="btn btn-primary btn-sm">
          新建训练
        </Link>
      </div>

      {loading ? (
        <p className="muted">加载中…</p>
      ) : filtered.length === 0 ? (
        <Panel>
          <p className="muted">暂无匹配的模型。</p>
          <Link to="/train" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
            去训练
          </Link>
        </Panel>
      ) : (
        <div className="model-list">
          {filtered.map((m) => (
            <ModelListItem key={m.id} model={m} activeModelId={activeId} />
          ))}
        </div>
      )}
    </div>
  );
}
