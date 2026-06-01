import type { TrainingJobStatus } from '../api/client';
import { jobStatusLabel } from '../utils/labels';
import { Panel } from './ui';

interface Props {
  job: TrainingJobStatus | null;
}

export default function TrainingProgress({ job }: Props) {
  if (!job) return null;

  const statusText = jobStatusLabel[job.status] ?? job.status;

  return (
    <Panel title="训练进度">
      <div className="progress-header">
        <span>{statusText}</span>
        <span>{job.progress.toFixed(1)}%</span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${job.status === 'failed' ? 'failed' : ''}`}
          style={{ width: `${job.progress}%` }}
        />
      </div>
      <p className="muted" style={{ marginTop: 8 }}>{job.message}</p>
      {job.metrics.quantization_error != null && (
        <p style={{ marginTop: 8, fontSize: 13 }}>
          量化误差：{' '}
          <strong>{job.metrics.quantization_error.toFixed(4)}</strong>
        </p>
      )}
      {job.error && <p className="text-error" style={{ marginTop: 8 }}>{job.error}</p>}
      {job.model_id && (
        <p className="text-success" style={{ marginTop: 8 }}>
          模型已保存：{job.model_id}
        </p>
      )}
    </Panel>
  );
}
