// review/SpellingMode.tsx — 拼写模式：发音/释义提示，用户拼写，逐字母实时比对
import { useState, useEffect, useRef } from "react";
import { useAppStore } from "../store/useAppStore";
import { useCurrentItem } from "./shared";
import { speak } from "../utils/misc";

export function SpellingMode() {
  const cur = useCurrentItem();
  const lib = useAppStore((s) => s.currentLib);
  const answerSpelling = useAppStore((s) => s.answerSpelling);
  const nextCard = useAppStore((s) => s.nextCard);
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const lang = lib?.lang || "en";
  useEffect(() => { setInput(""); setSubmitted(false); setTimeout(() => inputRef.current?.focus(), 100); }, [cur?.item.word.wordId]);

  if (!cur) return null;
  const { item, answered } = cur;
  const target = (lang === "ja" ? item.word.kana || item.word.word : item.word.word) || item.word.word;

  // 逐字母比对
  const cmp = (() => {
    const arr: { ch: string; status: "ok" | "bad" | "miss" }[] = [];
    const v = input.trim();
    const t = target.trim();
    const len = Math.max(v.length, t.length);
    for (let i = 0; i < len; i++) {
      const a = v[i] || "";
      const tg = t[i] || "";
      if (!tg) arr.push({ ch: a, status: "bad" });
      else if (!a) arr.push({ ch: tg, status: "miss" });
      else if (a.toLowerCase() === tg.toLowerCase()) arr.push({ ch: a, status: "ok" });
      else arr.push({ ch: a, status: "bad" });
    }
    return arr;
  })();

  const last = item.state.history[item.state.history.length - 1];
  const correct = answered && last?.correct;

  const submit = () => {
    if (submitted) return;
    setSubmitted(true);
    answerSpelling(input);
  };

  return (
    <>
      <div className="word-card">
        <button className="speak-btn" style={{ margin: "0 auto 10px" }} onClick={() => speak(lang === "ja" ? item.word.kana || item.word.word : item.word.word, lang)}>🔊 听发音</button>
        <div className="meaning" style={{ margin: "12px 0" }}>{item.word.meaning}</div>
        {item.word.pos && <span className="pos">{item.word.pos}</span>}
      </div>
      <input
        ref={inputRef}
        className="spell-input"
        value={input}
        onChange={(e) => !submitted && setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !submitted) submit(); }}
        placeholder={lang === "ja" ? "输入假名…" : "拼写单词…"}
        disabled={submitted}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {submitted && (
        <div className="spell-result">
          {cmp.map((c, i) => (
            <div key={i} className={`spell-char ${c.status === "ok" ? "ok" : c.status === "bad" ? "bad" : "miss"}`}>{c.ch}</div>
          ))}
        </div>
      )}
      {submitted && correct != null && (
        <div className={`feedback show ${correct ? "correct" : "wrong"}`}>
          {correct ? "✓ 拼写正确！" : `✗ 正确：${target}`}
          {item.word.phonetic && ` · ${item.word.phonetic}`}
        </div>
      )}
      {!submitted && <button className="btn primary" onClick={submit} style={{ marginTop: 12 }}>提交</button>}
      {submitted && <button className="btn primary" onClick={() => nextCard()} style={{ marginTop: 12 }}>下一题 →</button>}
    </>
  );
}
