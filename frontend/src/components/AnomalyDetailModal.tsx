import { useEffect } from 'react';
import type { AnomalyRecord } from '../api/client';
import { labelField } from '../utils/fieldLabels';

interface Props {
  anomaly: AnomalyRecord;
  featureColumns?: string[];
  qeThreshold?: number | null;
  /** 与当前异常落在同一 BMU 格子的全部记录（用于同格切换） */
  sameCellAnomalies?: AnomalyRecord[];
  onSelectAnomaly?: (anomaly: AnomalyRecord) => void;
  onClose: () => void;
}

function formatValue(val: unknown): string {
  if (val == null || val === '') return '—';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? String(val) : val.toFixed(4);
  }
  return String(val);
}

function isFeatureColumn(col: string, featureColumns?: string[]): boolean {
  if (!featureColumns?.length) return false;
  return featureColumns.includes(col) || featureColumns.some((f) => labelField(f) === col);
}

export default function AnomalyDetailModal({
  anomaly,
  featureColumns,
  qeThreshold,
  sameCellAnomalies,
  onSelectAnomaly,
  onClose,
}: Props) {
  const sameCellCount = sameCellAnomalies?.length ?? 0;
  const sameCellIndex =
    sameCellCount > 0
      ? sameCellAnomalies!.findIndex((a) => a.row_index === anomaly.row_index)
      : -1;
  const canPrev = sameCellIndex > 0 && onSelectAnomaly;
  const canNext =
    sameCellIndex >= 0 && sameCellIndex < sameCellCount - 1 && onSelectAnomaly;

  const goSibling = (delta: number) => {
    if (!sameCellAnomalies || !onSelectAnomaly || sameCellIndex < 0) return;
    const next = sameCellAnomalies[sameCellIndex + delta];
    if (next) onSelectAnomaly(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && canPrev) {
        e.preventDefault();
        goSibling(-1);
      }
      if (e.key === 'ArrowRight' && canNext) {
        e.preventDefault();
        goSibling(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, canPrev, canNext, sameCellIndex, sameCellAnomalies, anomaly.row_index]);

  const entries = Object.entries(anomaly.row_data ?? {}).sort(([a], [b]) => {
    const aFeat = isFeatureColumn(a, featureColumns);
    const bFeat = isFeatureColumn(b, featureColumns);
    if (aFeat !== bFeat) return aFeat ? -1 : 1;
    return labelField(a).localeCompare(labelField(b), 'zh-CN');
  });

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="anomaly-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 id="anomaly-detail-title">异常数据详情</h3>
            <p className="muted" style={{ marginTop: 4 }}>{anomaly.row_id}</p>
            {sameCellCount > 1 && sameCellIndex >= 0 && (
              <p className="muted" style={{ marginTop: 4 }}>
                同格第 {sameCellIndex + 1} / {sameCellCount} 条 · ← → 切换
              </p>
            )}
          </div>
          <div className="row">
            {sameCellCount > 1 && onSelectAnomaly && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!canPrev}
                  onClick={() => goSibling(-1)}
                  aria-label="上一条同格异常"
                >
                  上一条
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!canNext}
                  onClick={() => goSibling(1)}
                  aria-label="下一条同格异常"
                >
                  下一条
                </button>
              </>
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              关闭
            </button>
          </div>
        </div>

        <div className="modal-body">
          <dl className="kv-grid">
            <dt>量化误差</dt>
            <dd style={{ color: 'var(--error)' }}>
              {anomaly.quantization_error.toFixed(4)}
              {qeThreshold != null && (
                <span className="muted" style={{ marginLeft: 4 }}>
                  （阈值 {qeThreshold.toFixed(3)}）
                </span>
              )}
            </dd>
            <dt>地图位置 (x, y)</dt>
            <dd>
              ({anomaly.bmu_x}, {anomaly.bmu_y})
              {sameCellCount > 1 && (
                <span className="muted" style={{ marginLeft: 4 }}>
                  该格共 {sameCellCount} 条异常
                </span>
              )}
            </dd>
            {anomaly.label != null && (
              <>
                <dt>标签 / 工况</dt>
                <dd>{anomaly.label}</dd>
              </>
            )}
            <dt>判定原因</dt>
            <dd>
              <div className="flag-row">
                {anomaly.reasons.map((r) => (
                  <span key={r} className="flag">
                    {r}
                  </span>
                ))}
              </div>
            </dd>
          </dl>

          <h4 className="section-heading">原始数据字段</h4>
          <p className="muted" style={{ marginBottom: 8 }}>
            高亮行为模型训练/测试使用的工艺特征列。
          </p>
          <table className="table">
            <tbody>
              {entries.length > 0 ? (
                entries.map(([col, val]) => {
                  const highlight = isFeatureColumn(col, featureColumns);
                  return (
                    <tr key={col} className={highlight ? 'feature-row' : undefined}>
                      <td style={{ color: 'var(--text-muted)' }}>{labelField(col)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatValue(val)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: 16 }}>
                    <span className="muted">暂无原始数据（请重新运行测试以加载详情）</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
