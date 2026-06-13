// Tiny inline sparkline for trust/utilization timelines.

export function Sparkline({
  values, width = 280, height = 60, color = "oklch(0.74 0.18 152)",
  fill = true, showDots = false,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  showDots?: boolean;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${d} L${pad + w},${pad + h} L${pad},${pad + h} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {fill && <path d={area} fill={color} opacity={0.12} />}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {showDots && pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill={color} />
      ))}
    </svg>
  );
}
