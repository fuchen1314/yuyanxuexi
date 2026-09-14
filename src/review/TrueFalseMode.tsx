// review/TrueFalseMode.tsx — 判断对错：显示「单词 + 释义」，判断是否匹配
import { useAppStore } from "../store/useAppStore";
import { useCurrentItem } from "./shared";
import { speak } from "../utils/misc";

export function TrueFalseMode() {
  const cur = useCurrentItem();
  const lib = useAppStore((s) => s.currentLib);
  const answerTrueFalse = useAppStore((s) => s.answerTrueFalse);
  const nextCard = useAppStore((s) => s.nextCard);
  if (!cur) return null;
  const { item, choices, answered, correctIndex } = cur;
  const lang = lib?.lang || "en";
  // choices[0] 是展示的释义；correctIndex: 1=该释义正确(对), 0=该释义错误(错)
  const shown = choices[0] || "";
  const truth = correctIndex === 1;
  const last = item.state.history[item.state.history.length - 1];
  const userCorrect = answered && last?.correct;

  return (
    <>
      <div className="word-card">
        {item.word.pos && <span className="pos">{item.word.pos}</span>}
        {item.word.emoji && <div className="emoji">{item.word.emoji}</div>}
        <div className="word">{item.word.word}</div>
        {item.word.kana && <div className="kana">{item.word.kana}</div>}
        {item.word.phonetic && <div className="phonetic">{item.word.phonetic}</div>}
        <button className="speak-btn" onClick={() => speak(lang === "ja" ? item.word.kana || item.word.word : item.word.word, lang)}>🔊</button>
        <div className="meaning" style={{ marginTop: 14, padding: "8px 12px", background: "var(--bg)", borderRadius: 10 }}>{shown}</div>
        <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 8 }}>这个词与释义匹配吗？</div>
      </div>
      {!answered ? (
        <div className="tf-row">
          <button className="tf-btn wrong" onClick={() => answerTrueFalse(false)}>✗ 不匹配</button>
          <button className="tf-btn right" onClick={() => answerTrueFalse(true)}>✓ 匹配</button>
        </div>
      ) : (
        <div className="feedback show" style={{ background: userCorrect ? "var(--primary-light)" : "#FFF0EE", color: userCorrect ? "var(--primary-dark)" : "var(--danger)" }}>
          {userCorrect ? "✓ 判断正确！" : `✗ 正确答案：${truth ? "匹配" : "不匹配"}（真实释义：${item.word.meaning}）`}
        </div>
      )}
      {answered && <button className="btn primary" onClick={() => nextCard()} style={{ marginTop: 12 }}>下一题 →</button>}
    </>
  );
}
