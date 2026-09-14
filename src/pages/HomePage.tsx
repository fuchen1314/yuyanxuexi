// pages/HomePage.tsx — 词库 hero + 今日任务 + 继续上次 + 热力图
import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { Heatmap } from "../components/Heatmap";

export function HomePage({ onImport }: { onImport: () => void }) {
  const lib = useAppStore((s) => s.currentLib);
  const stats = useAppStore((s) => s.stats);
  const settings = useAppStore((s) => s.settings);
  const startLearn = useAppStore((s) => s.startLearn);
  const startReview = useAppStore((s) => s.startReview);
  const setView = useAppStore((s) => s.setView);
  const refresh = useAppStore((s) => s.refreshStats);

  useEffect(() => { refresh(); }, [lib?.id]);

  if (!lib || !stats) {
    return (
      <div className="empty">
        <div className="ico">📚</div>
        <h2 style={{ fontSize: 20, marginBottom: 8, color: "var(--text)" }}>还没有词库</h2>
        <p style={{ fontSize: 13, marginBottom: 20 }}>导入一个词库即可开始背单词</p>
        <button className="btn primary" style={{ maxWidth: 240, margin: "0 auto" }} onClick={onImport}>📥 导入第一个词库</button>
        <p style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 16 }}>支持 JSON / CSV，离线使用，数据全部存于本地</p>
      </div>
    );
  }
  const learned = stats.mastered + stats.learning + stats.review;
  const total = stats.total || lib.total || 0;
  const pct = total > 0 ? Math.round((learned / total) * 100) : 0;
  const todayNew = settings?.todayStudied || 0;
  const goal = settings?.dailyGoal || 20;
  const estSec = (stats.due + Math.max(0, goal - todayNew)) * 8;
  const hasResume = settings?.resumeWordId != null;

  return (
    <>
      <section className="home-hero">
        <span className="lang-tag">{flag(lib.lang)} · {lib.level || lib.name}</span>
        <h2>{lib.name}</h2>
        <div className="sub">已学 {learned} / {total} 词 · 掌握 {stats.mastered}</div>
        <div className="home-progress"><div style={{ width: `${pct}%` }} /></div>
        <div className="home-meta">
          <span>今日新词 {todayNew} / {goal}</span>
          <span>连续打卡 {stats.streak} 天</span>
        </div>
      </section>

      {hasResume && (
        <div className="resume-card" onClick={() => settings?.resumeMode === "review" ? startReview() : startLearn()}>
          <div className="ico">▶️</div>
          <div className="info">
            <div className="t">继续上次学习</div>
            <div className="d">{settings?.resumeMode === "review" ? "复习模式" : "学习模式"} · 第 {settings?.resumeWordId} 词</div>
          </div>
          <div className="arrow">›</div>
        </div>
      )}

      <div className="section-title">今日任务</div>
      <div className="action-grid">
        <div className="action-card primary" onClick={() => startLearn()}>
          <div className="ico">📖</div>
          <div className="label">学新词</div>
          <div className="desc">{stats.fresh > 0 ? `还有 ${stats.fresh} 个新词` : "巩固中"}</div>
        </div>
        <div className="action-card" onClick={() => startReview()}>
          <div className="ico">🔁</div>
          <div className="label">去复习</div>
          <div className="desc">{stats.due > 0 ? `${stats.due} 个待复习` : "暂无到期"}</div>
        </div>
      </div>

      <div className="section-title">今日概览 <span style={{ fontSize: 11, color: "var(--text-mute)" }}>预计 {estSec > 60 ? `${Math.floor(estSec / 60)} 分` : `${estSec} 秒`}</span></div>
      <div className="home-stats">
        <div className="stat-pill"><div className="num">{todayNew}</div><div className="lbl">今日新词</div></div>
        <div className="stat-pill"><div className="num">{stats.due}</div><div className="lbl">待复习</div></div>
        <div className="stat-pill"><div className="num">{stats.wrong}</div><div className="lbl">错题</div></div>
      </div>

      <div className="section-title">连续学习 <span style={{ fontSize: 11, color: "var(--text-mute)" }}>最近 14 天</span></div>
      <div className="stats-card" style={{ padding: 12 }}>
        <Heatmap days={stats.days} />
      </div>
    </>
  );
}

const flag = (l: string) => (l === "en" ? "🇬🇧" : l === "ja" ? "🇯🇵" : "🌐");
