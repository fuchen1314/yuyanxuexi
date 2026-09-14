// components/LineChart.tsx — 原生 SVG 折线图（学习曲线）
interface Pt { label: string; v: number }
export function LineChart({ data, color = "#4CAF8F", height = 120, label }: { data: Pt[]; color?: string; height?: number; label?: string }) {
  const w = 320;
  const pad = 24;
  const max = Math.max(1, ...data.map((d) => d.v));
  const step = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;
  const pts = data.map((d, i) => {
    const x = pad + i * step;
    const y = height - pad - (d.v / max) * (height - pad * 2);
    return { x, y, ...d };
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: "100%", height }}>
      {/* baseline */}
      <line x1={pad} y1={height - pad} x2={w - pad} y2={height - pad} stroke="#EDEFF2" strokeWidth="1" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#EDEFF2" strokeWidth="1" />
      {/* area */}
      {pts.length > 1 && (
        <path d={`${path} L${pts[pts.length - 1].x.toFixed(1)},${(height - pad)} L${pts[0].x.toFixed(1)},${(height - pad)} Z`} fill={color} opacity={0.12} />
      )}
      {/* line */}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* dots */}
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />)}
      {/* x labels (稀疏) */}
      {data.map((d, i) => {
        if (data.length > 7 && i % Math.ceil(data.length / 6) !== 0) return null;
        const x = pad + i * step;
        return <text key={i} x={x} y={height - 6} fontSize="8" fill="#9CA3AF" textAnchor="middle">{d.label}</text>;
      })}
      {label && <text x={pad} y={12} fontSize="9" fill="#6B7280">{label}</text>}
    </svg>
  );
}
