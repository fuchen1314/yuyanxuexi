// components/Heatmap.tsx — SVG 风格热力图（用 div 实现）
export interface HeatCell { date: string; count: number }
export function Heatmap({ days }: { days: HeatCell[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="heatmap">
      {days.map((d) => {
        let lvl = "";
        if (d.count > 0) {
          const r = d.count / max;
          lvl = r <= 0.25 ? "l1" : r <= 0.5 ? "l2" : r <= 0.75 ? "l3" : "l4";
        }
        return <div key={d.date} className={`cell ${lvl}`} title={`${d.date}: ${d.count} 词`} />;
      })}
    </div>
  );
}
