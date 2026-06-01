import { useCallback, useId, useState } from 'react';
import { Upload } from 'lucide-react';
import { api } from '../api/client';
import type { DatasetPreview } from '../api/client';
import { Panel } from './ui';

interface Props {
  onUploaded: (dataset: DatasetPreview) => void;
}

export default function DataUploader({ onUploaded }: Props) {
  const inputId = useId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('请上传 CSV 文件');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const dataset = await api.uploadDataset(file);
        onUploaded(dataset);
      } catch (e) {
        setError(e instanceof Error ? e.message : '上传失败');
      } finally {
        setLoading(false);
      }
    },
    [onUploaded],
  );

  return (
    <Panel title="上传数据集">
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        <input
          id={inputId}
          type="file"
          accept=".csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <Upload size={24} style={{ marginBottom: 8, color: 'var(--text-muted)' }} />
        <p className="muted">
          {loading ? '上传中...' : '拖拽 CSV 到此处，或点击选择文件'}
        </p>
      </div>
      {error && <p className="text-error" style={{ marginTop: 8 }}>{error}</p>}
    </Panel>
  );
}
