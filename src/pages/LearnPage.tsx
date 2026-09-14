// pages/LearnPage.tsx — 新词展示卡片流（发音 + 下一个，结束后自动入复习）
import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { speak } from "../utils/misc";
import { WordCardView } from "../components/WordCard";

export function LearnPage() {
  const session = useAppStore((s) => s.session);
  const lib = useAppStore((s) => s.currentLib);
  const startLearn = useAppStore((s) => s.startLearn);
  const learnNext = useAppStore((s) => s.learnNext);
  const setView = useAppStore((s) => s.setView);
  const toggleHard = useAppStore((s) => s.toggleHardBook);

  useEffect(() => {
    if (!session) startLearn();
  }, []);

  if (!session) {
    return <div className="empty"><div className="ico">⏳</div><p>准备学习中…</p></div>;
  }
  if (session.idx >= session.queue.length) {
    return (
      <div className="done-card">
        <div className="ico">🎉</div>
        <h2>新词学完</h2>
        <p>已学 {session.newCount} 个新词</p>
        <div style={{ marginTop: 24 }}><button className="btn primary" onClick={() => setView("home")}>返回首页</button></div>
      </div>
    );
  }
  const item = session.queue[session.idx];
  if (!item?.word) { learnNext(); return null; }
  const pct = Math.round((session.idx / session.queue.length) * 100);

  return (
    <div className="learn-wrap">
      <div className="learn-header">
        <span>新词 · {session.idx + 1}/{session.queue.length}</span>
        <span>{lib?.lang === "ja" ? "🇯🇵" : "🇬🇧"}</span>
      </div>
      <div className="learn-progress-bar"><div style={{ width: `${pct}%` }} /></div>

      <WordCardView
        word={item.word}
        lang={lib?.lang || "en"}
        onSpeak={() => speak(lib?.lang === "ja" ? item.word.kana || item.word.word : item.word.word, lib?.lang || "en")}
        reveal
        hard={item.state.inHardBook}
        onToggleHard={() => toggleHard(item.word.wordId, !item.state.inHardBook)}
      />

      <button className="btn primary" onClick={() => learnNext()}>下一个 →</button>
    </div>
  );
}
