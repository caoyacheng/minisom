import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnomalyRecord, EvaluationResult } from '../api/client';

const REASON_COLORS: Record<string, string> = {
  量化误差偏高: '#dc2626',
  落在样本稀少的地图区域: '#ea580c',
  与次近状态在地图上不相邻: '#ca8a04',
};

function MapGrid({
  title,
  data,
  colorScale,
  emptyLabel = '0',
  onCellClick,
}: {
  title: string;
  data: number[][];
  colorScale: (v: number, max: number) => string;
  emptyLabel?: string;
  onCellClick?: (x: number, y: number) => void;
}) {
  if (!data.length) return null;
  const max = Math.max(...data.flat(), 1);

  return (
    <div>
      <h4 className="sub-panel-title">{title}</h4>
      <div
        className="heatmap-grid"
        style={{ gridTemplateColumns: `repeat(${data[0].length}, minmax(0, 1fr))` }}
      >
        {data.map((row, i) =>
          row.map((val, j) => (
            <div
              key={`${i}-${j}`}
              title={val > 0 ? `${val} 条，点击查看` : emptyLabel}
              role={val > 0 && onCellClick ? 'button' : undefined}
              tabIndex={val > 0 && onCellClick ? 0 : undefined}
              className={`heatmap-cell lg ${val > 0 && onCellClick ? 'clickable' : ''}`}
              style={{ backgroundColor: colorScale(val, max) }}
              onClick={() => val > 0 && onCellClick?.(i, j)}
              onKeyDown={(e) => {
                if (val > 0 && onCellClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onCellClick(i, j);
                }
              }}
            >
              {val > 0 ? val : ''}
            </div>
          )),
        )}
      </div>
    </div>
  );
}

interface Props {
  result: EvaluationResult;
  onSelectAnomaly: (anomaly: AnomalyRecord) => void;
}

export default function AnomalyCharts({ result, onSelectAnomaly }: Props) {
  const { samples, anomalies, qe_threshold, reason_stats, anomaly_map, sample_map } =
    result;

  const normalPoints = samples
    .filter((s) => !s.is_anomaly)
    .map((s) => ({
      index: s.row_index + 1,
      qe: s.quantization_error,
      row_id: s.row_id,
      kind: '正常',
    }));

  const selectByRowIndex = (rowIndex: number) => {
    const hit = anomalies.find((a) => a.row_index === rowIndex);
    if (hit) onSelectAnomaly(hit);
  };

  const selectByBmu = (x: number, y: number) => {
    const hits = anomalies
      .filter((a) => a.bmu_x === x && a.bmu_y === y)
      .sort((a, b) => b.quantization_error - a.quantization_error);
    if (hits[0]) onSelectAnomaly(hits[0]);
  };

  const anomalyPoints = samples
    .filter((s) => s.is_anomaly)
    .map((s) => ({
      index: s.row_index + 1,
      row_index: s.row_index,
      qe: s.quantization_error,
      row_id: s.row_id,
      kind: '可能异常',
    }));

  const topBars = anomalies.slice(0, 15).map((a) => ({
    name: a.row_id.length > 10 ? `${a.row_id.slice(0, 8)}…` : a.row_id,
    fullName: a.row_id,
    row_index: a.row_index,
    qe: a.quantization_error,
  }));

  const reasonPie = Object.entries(reason_stats ?? {}).map(([name, value]) => ({
    name,
    value,
  }));

  const redScale = (v: number, max: number) => {
    if (v <= 0) return 'var(--bg-tertiary)';
    const t = v / max;
    const r = Math.round(254 - t * 40);
    const g = Math.round(226 - t * 180);
    const b = Math.round(226 - t * 180);
    return `rgb(${r},${g},${b})`;
  };

  const blueScale = (v: number, max: number) => {
    if (v <= 0) return 'var(--bg-tertiary)';
    const t = v / max;
    return `rgb(${Math.round(219 - t * 120)}, ${Math.round(234 - t * 50)}, ${Math.round(254)})`;
  };

  return (
    <div className="page-stack" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
      <div>
        <h4 className="anomaly-section-title">异常可视化</h4>
        <p className="muted">
          下图帮助快速对比：哪些样本误差偏高、异常在地图哪些格子聚集、以及各类判定原因占比。
          点击红点、条形、红色地图格或下方表格行可查看该条数据的详情。
        </p>
      </div>

      <div className="grid-2">
        {sample_map && sample_map.length > 0 && (
          <div className="sub-panel">
            <MapGrid title="全部测试样本在地图上的数量" data={sample_map} colorScale={blueScale} />
          </div>
        )}
        {anomaly_map && anomaly_map.length > 0 && (
          <div className="sub-panel warning">
            <MapGrid
              title="可能异常样本在地图上的数量（红越深越多）"
              data={anomaly_map}
              colorScale={redScale}
              onCellClick={selectByBmu}
            />
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="sub-panel">
          <h4 className="sub-panel-title">每条样本的量化误差</h4>
          <p className="muted" style={{ marginBottom: 8 }}>
            横轴为样本序号，纵轴为量化误差；橙线为异常判定阈值
            {qe_threshold != null ? `（${qe_threshold.toFixed(3)}）` : ''}。
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                dataKey="index"
                name="序号"
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                label={{ value: '样本序号', position: 'insideBottom', offset: -4, fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="qe"
                name="量化误差"
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => [
                  typeof value === 'number' ? value.toFixed(4) : String(value ?? ''),
                  '量化误差',
                ]}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as { row_id?: string; kind?: string };
                  return p?.row_id ? `${p.kind ?? ''} · ${p.row_id}` : '';
                }}
              />
              {qe_threshold != null && (
                <ReferenceLine
                  y={qe_threshold}
                  stroke="var(--warning)"
                  strokeDasharray="4 4"
                  label={{ value: '阈值', position: 'right', fontSize: 10, fill: 'var(--warning)' }}
                />
              )}
              <Legend />
              <Scatter name="正常" data={normalPoints} fill="var(--accent)" opacity={0.65} />
              <Scatter
                name="可能异常"
                data={anomalyPoints}
                fill="var(--error)"
                cursor="pointer"
                onClick={(pt) => {
                  const rowIndex = (pt as { row_index?: number }).row_index;
                  if (rowIndex != null) selectByRowIndex(rowIndex);
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="sub-panel">
          <h4 className="sub-panel-title">异常原因占比</h4>
          <p className="muted" style={{ marginBottom: 8 }}>
            一条样本可能同时命中多种原因，因此各原因计数之和可能大于异常条数。
          </p>
          {reasonPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={reasonPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {reasonPie.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={REASON_COLORS[entry.name] ?? '#64748b'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => [`${typeof v === 'number' ? v : v ?? 0} 次`, '命中']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="muted">暂无原因统计</p>
          )}
        </div>
      </div>

      {topBars.length > 0 && (
        <div className="sub-panel">
          <h4 className="sub-panel-title">
            量化误差最高的异常样本（前 {topBars.length} 条）
          </h4>
          <ResponsiveContainer width="100%" height={Math.min(320, 40 + topBars.length * 22)}>
            <BarChart data={topBars} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v) => [
                  typeof v === 'number' ? v.toFixed(4) : String(v ?? ''),
                  '量化误差',
                ]}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as { fullName?: string };
                  return p?.fullName ?? '';
                }}
              />
              {qe_threshold != null && (
                <ReferenceLine
                  x={qe_threshold}
                  stroke="var(--warning)"
                  strokeDasharray="4 4"
                  label={{ value: '阈值', position: 'top', fontSize: 10 }}
                />
              )}
              <Bar dataKey="qe" fill="var(--error)" radius={[0, 4, 4, 0]} cursor="pointer">
                {topBars.map((bar) => (
                  <Cell
                    key={bar.row_index}
                    onClick={() => selectByRowIndex(bar.row_index)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
