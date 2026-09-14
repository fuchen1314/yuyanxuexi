// review/ListenToMeaning.tsx — 听音选义：TTS 播放发音，四选一选释义
import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { useCurrentItem, Feedback, choiceClass } from "./shared";
import { speak, hasUserInteracted } from "../utils/misc";

export function ListenToMeaning() {
  const cur = useCurrentItem();
  const lib = useAppStore((s) => s.currentLib);
  const answerChoice = useAppStore((s) => s.answerChoice);
  const nextCard = useAppStore((s) => s.nextCard);
  const lang = lib?.lang || "en";
  // 是否已首次听过（用户点击播放后变 true，之后自动播放）
  const [primed, setPrimed] = useState(false);

  useEffect(() => {
    if (cur && !cur.answered) {
      const w = cur.item.word;
      // 移动端需要用户交互后才能自动 speak
      if (primed || hasUserInteracted()) {
        speak(lang === "ja" ? w.kana || w.word : w.word, lang);
      }
    }
  }, [cur?.item.word.wordId, primed]);

  if (!cur) return null;
  const { item, choices, answered, correctIndex } = cur;
  const last = item.state.history[item.state.history.length - 1];
  const correct = answered && last?.correct;
  const w = item.word;

  const doSpeak = () => {
    setPrimed(true);
    speak(lang === "ja" ? w.kana || w.word : w.word, lang);
  };

  return (
    <>
      <div className="word-card">
        <div className="emoji">🎧</div>
        <div style={{ fontSize: 13, color: "var(--text-mute)", marginBottom: 10 }}>听发音，选释义</div>
        <button className="speak-btn" onClick={doSpeak}>
          🔊 {primed || hasUserInteracted() ? "再听一次" : "点我播放"}
        </button>
        {lang === "ja" && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-sub)", marginTop: 8 }}>
            <input type="checkbox" defaultChecked={false} onChange={(e) => { if (e.target.checked) speak(w.kana || w.word, lang); }} /> 显示假名
          </label>
        )}
        {lang === "ja" && (
          <div style={{ display: "none" }} data-kana>{w.kana}</div>
        )}
      </div>
      <div className="choices">
        {choices.map((c, i) => (
          <div
            key={i}
            className={`choice ${choiceClass(i, answered, correctIndex)} ${answered ? "disabled" : ""}`}
            onClick={() => !answered && answerChoice(i)}
          >{c}</div>
        ))}
      </div>
      {answered && (
        <div className="word-card" style={{ marginTop: 10, padding: 16 }}>
          <div className="word">{w.word}</div>
          {w.kana && <div className="kana">{w.kana}</div>}
          <div className="meaning">{w.meaning}</div>
        </div>
      )}
      <Feedback answered={answered} correct={correct} />
      {answered && <button className="btn primary" onClick={() => nextCard()}>下一题 →</button>}
    </>
  );
}
