// pages/StatsPage.tsx — 当前词库曲线/热力图/掌握度 + 全局汇总
import { useState, useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { Heatmap } from "../components/Heatmap";
import { LineChart } from "../components/LineChart";
import { MasteryBar } from "../components/MasteryBar";
import { listLibraries } from "../db";
import { getStats } from "../srs/scheduler";
import type { LibraryMeta, LibStats } from "../types";

export function StatsPage() {
  const lib = useAppStore((s) => s.currentLib);
  const stats = useAppStore((s) => s.stats);
  const refresh = useAppStore((s) => s.refreshStats);
  const [global, setGlobal] = useState<{ total: number; mastered: number; days: number; acc: number } | null>(null);

  useEffect(() => { refresh(); }, [lib?.id]);
  useEffect(() => {
    (async () => {
      const libs = await listLibraries();
      let total = 0, mastered = 0, days = 0, correct = 0, wrong = 0;
      for (const l of libs) {
        const s = await getStats(l.id);
        total += s.total; mastered += s.mastered; days += s.totalDays;
        // 累计正确/错从 logs — 这里用 acc 估算
      }
      setGlobal({ total, mastered, days, acc: 0 });
    })();
  }, []);

  if (!lib || !stats) return <div className="empty"><div className="ico">📊</div><p>请先选择词库</p></div>;

  // 掌握度 4 档
  const fresh = stats.fresh;
  const learning = stats.learning;
  const review = stats.review;
  const mastered = stats.mastered;
  // 学习曲线数据（近 14 天）
  const newData = stats.days.map((d) => ({ label: d.date.slice(5), v: d.newCount }));
  const revData = stats.days.map((d) => ({ label: d.date.slice(5), v: d.reviewCount }));

  return (
    <>
      <div className="stats-card">
        <h3>{lib.lang === "en" ? "🇬🇧" : lib.lang === "ja" ? "🇯🇵" : "🌐"} {lib.name}</h3>
        <div className="stats-grid">
          <div className="item"><div className="num">{stats.total}</div><div className="lbl">总词数</div></div>
          <div className="item"><div className="num">{stats.mastered}</div><div className="lbl">已掌握</div></div>
          <div className="item"><div className="num">{stats.review}</div><div className="lbl">复习中</div></div>
          <div className="item"><div className="num">{stats.learning}</div><div className="lbl">学习中</div></div>
          <div className="item"><div className="num">{stats.fresh}</div><div className="lbl">未开始</div></div>
          <div className="item"><div className="num">{stats.due}</div><div className="lbl">待复习</div></div>
        </div>
      </div>

      <div className="stats-card">
        <h3>掌握度分布</h3>
        <MasteryBar segments={[
          { label: "未学", count: fresh, cls: "" },
          { label: "生疏", count: learning, cls: "s1" },
          { label: "认识", count: review, cls: "s2" },
          { label: "掌握", count: mastered, cls: "s4" },
        ]} />
      </div>

      <div className="stats-card">
        <h3>学习表现</h3>
        <div className="stats-grid">
          <div className="item"><div className="num">{stats.acc}%</div><div className="lbl">正确率</div></div>
          <div className="item"><div className="num">{stats.streak}</div><div className="lbl">连续打卡</div></div>
          <div className="item"><div className="num">{stats.totalDays}</div><div className="lbl">学习天数</div></div>
          <div className="item"><div className="num">{stats.wrong}</div><div className="lbl">错题</div></div>
        </div>
      </div>

      <div className="stats-card">
        <h3>新词学习曲线（14 天）</h3>
        <LineChart data={newData} color="#4CAF8F" label="新学" />
      </div>
      <div className="stats-card">
        <h3>复习曲线（14 天）</h3>
        <LineChart data={revData} color="#FF7A59" label="复习" />
      </div>
      <div className="stats-card">
        <h3>打卡热力图</h3>
        <Heatmap days={stats.days} />
      </div>

      {global && (
        <div className="stats-card">
          <h3>🌍 全局汇总</h3>
          <div className="stats-grid">
            <div className="item"><div className="num">{global.total}</div><div className="lbl">总词数</div></div>
            <div className="item"><div className="num">{global.mastered}</div><div className="lbl">总掌握</div></div>
            <div className="item"><div className="num">{global.days}</div><div className="lbl">总学习天</div></div>
            <div className="item"><div className="num">{useAppStore.getState().libraries.length}</div><div className="lbl">词库数</div></div>
          </div>
        </div>
      )}
    </>
  );
}
