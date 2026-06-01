import { useCallback, useId, useState } from 'react';
import { Upload } from 'lucide-react';
import { api, type DatasetPreview } from '../../api/client';

interface Props {
  onUploaded: (dataset: DatasetPreview) => void;
  label?: string;
}

export function PipelineCsvUpload({ onUploaded, label = '上传 CSV' }: Props) {
  const inputId = useId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="pipeline-node-upload nodrag nopan">
      <label htmlFor={inputId} className="pipeline-node-upload-btn">
        <Upload size={14} />
        {loading ? '上传中…' : label}
      </label>
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
      {error && <p className="pipeline-node-error">{error}</p>}
    </div>
  );
}
