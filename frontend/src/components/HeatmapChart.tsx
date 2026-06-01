import { Panel } from './ui';

interface Props {
  title: string;
  data: number[][];
}

export default function HeatmapChart({ title, data }: Props) {
  if (!data.length) return null;

  const flat = data.flat();
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  const range = max - min || 1;

  const color = (v: number) => {
    const t = (v - min) / range;
    const r = Math.round(30 + t * 200);
    const g = Math.round(60 + (1 - Math.abs(t - 0.5) * 2) * 120);
    const b = Math.round(220 - t * 180);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <Panel title={title}>
      <div
        className="heatmap-grid"
        style={{
          gridTemplateColumns: `repeat(${data[0].length}, minmax(0, 1fr))`,
        }}
      >
        {data.map((row, i) =>
          row.map((val, j) => (
            <div
              key={`${i}-${j}`}
              title={val.toFixed(4)}
              className="heatmap-cell sm"
              style={{ backgroundColor: color(val) }}
            />
          )),
        )}
      </div>
      <div className="heatmap-legend">
        <span>{min.toFixed(3)}</span>
        <span>{max.toFixed(3)}</span>
      </div>
    </Panel>
  );
}
