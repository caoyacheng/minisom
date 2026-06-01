import { useEffect, useState } from 'react';
import { api, type DatasetSummary } from '../../../api/client';
import { useAppContext } from '../../../context/AppContext';
import { PipelineCsvUpload } from '../PipelineCsvUpload';

export function DatasetNodeConfig() {
  const { trainDataset, onTrainUploaded } = useAppContext();
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);

  useEffect(() => {
    api.listDatasets().then((r) => setDatasets(r.datasets)).catch(() => {});
  }, [trainDataset?.id]);

  const selectDataset = async (id: string) => {
    try {
      const detail = await api.getDataset(id);
      onTrainUploaded(detail);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="pipeline-node-config nodrag nopan">
      <PipelineCsvUpload onUploaded={onTrainUploaded} />
      {datasets.length > 0 && (
        <label className="pipeline-node-field">
          <span>已有数据集</span>
          <select
            className="pipeline-node-input"
            value={trainDataset?.id ?? ''}
            onChange={(e) => {
              if (e.target.value) selectDataset(e.target.value);
            }}
          >
            <option value="">选择…</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.rows} 行)
              </option>
            ))}
          </select>
        </label>
      )}
      {trainDataset && (
        <p className="pipeline-node-meta">
          当前：{trainDataset.name} · {trainDataset.rows} 行
        </p>
      )}
    </div>
  );
}
