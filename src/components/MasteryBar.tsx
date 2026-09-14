// components/MasteryBar.tsx — 掌握度进度条（生疏/认识/熟悉/掌握 4 档）
export function MasteryBar({ segments }: { segments: { label: string; count: number; cls: string }[] }) {
  const total = Math.max(1, segments.reduce((a, s) => a + s.count, 0));
  return (
    <div>
      <div className="mastery">
        {segments.map((s, i) => (
          <div key={i} className={`seg ${s.cls}`} style={{ flex: Math.max(0.01, s.count / total) }} title={`${s.label}: ${s.count}`} />
        ))}
      </div>
      <div className="mastery-legend">
        {segments.map((s, i) => <span key={i}>{s.label} {s.count}</span>)}
      </div>
    </div>
  );
}
