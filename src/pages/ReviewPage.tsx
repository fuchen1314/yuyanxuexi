// pages/ReviewPage.tsx — 复习模式选择 + 自动轮换 5 种模式
import { useState } from "react";
import { useAppStore, REVIEW_MODES } from "../store/useAppStore";
import type { ReviewMode } from "../types";
import { ImageToMeaning } from "../review/ImageToMeaning";
import { MeaningToWord } from "../review/MeaningToWord";
import { SpellingMode } from "../review/SpellingMode";
import { ListenToMeaning } from "../review/ListenToMeaning";
import { TrueFalseMode } from "../review/TrueFalseMode";

const MODE_INFO: Record<ReviewMode, { icon: string; name: string; desc: string }> = {
  "image-to-meaning": { icon: "🖼", name: "看图选义", desc: "看单词选释义" },
  "meaning-to-word": { icon: "🔤", name: "看义选词", desc: "看释义选单词" },
  "spelling": { icon: "⌨️", name: "拼写模式", desc: "逐字母比对" },
  "listen-to-meaning": { icon: "🎧", name: "听音选义", desc: "听发音选释义" },
  "true-false": { icon: "✅", name: "判断对错", desc: "词义是否匹配" },
};

export function ReviewPage() {
  const session = useAppStore((s) => s.session);
  const lib = useAppStore((s) => s.currentLib);
  const mode = useAppStore((s) => s.reviewMode);
  const setMode = (m: ReviewMode) => useAppStore.setState({ reviewMode: m });
  const startReview = useAppStore((s) => s.startReview);
  const [picker, setPicker] = useState(false);

  if (!session) {
    return (
      <>
        <div className="section-title">选择复习模式</div>
        <div className="mode-grid">
          {REVIEW_MODES.map((m) => (
            <div key={m} className={`mode-card ${mode === m ? "active" : ""}`} onClick={() => setMode(m)}>
              <div className="ico">{MODE_INFO[m].icon}</div>
              <div className="t">{MODE_INFO[m].name}</div>
              <div className="d">{MODE_INFO[m].desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn primary" onClick={() => startReview(mode)}>开始复习</button>
        </div>
      </>
    );
  }
  if (session.idx >= session.queue.length) {
    return (
      <div className="done-card">
        <div className="ico">🎉</div>
        <h2>复习完成！</h2>
        <p>对 {session.correct} · 错 {session.wrong}</p>
        <div style={{ marginTop: 24 }}><button className="btn primary" onClick={() => useAppStore.getState().setView("home")}>返回首页</button></div>
      </div>
    );
  }
  const item = session.queue[session.idx];
  if (!item?.word) { useAppStore.getState().nextCard(); return null; }
  const pct = Math.round((session.idx / session.queue.length) * 100);

  return (
    <div className="learn-wrap">
      <div className="learn-header">
        <span>{MODE_INFO[mode].icon} {MODE_INFO[mode].name} · {session.idx + 1}/{session.queue.length}</span>
        <span style={{ cursor: "pointer", color: "var(--primary)" }} onClick={() => setPicker(true)}>切换模式</span>
      </div>
      <div className="learn-progress-bar"><div style={{ width: `${pct}%` }} /></div>

      {mode === "image-to-meaning" && <ImageToMeaning />}
      {mode === "meaning-to-word" && <MeaningToWord />}
      {mode === "spelling" && <SpellingMode />}
      {mode === "listen-to-meaning" && <ListenToMeaning />}
      {mode === "true-false" && <TrueFalseMode />}

      {picker && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setPicker(false); }}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <h3>切换复习模式</h3>
            {REVIEW_MODES.map((m) => (
              <button key={m} onClick={() => { setMode(m); setPicker(false); }} style={{ fontWeight: mode === m ? 600 : 400 }}>
                {MODE_INFO[m].icon} {MODE_INFO[m].name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
