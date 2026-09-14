// pages/WordBookPage.tsx — 生词本 / 错题本：列表 + 批量复习 + 导出 CSV + 复习历史时间线
import { useState, useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { getHardBook, getWrongBook, getAllWords, getState } from "../db";
import { downloadFile } from "../utils/misc";
import type { WordEntry, WordState } from "../types";
import { Overlay } from "../components/Overlay";

export function WordBookPage() {
  const lib = useAppStore((s) => s.currentLib);
  const refresh = useAppStore((s) => s.refreshStats);
  const exportBook = useAppStore((s) => s.exportBook);
  const startHardOrWrong = useAppStore((s) => s.startHardOrWrongReview);
  const toggleHard = useAppStore((s) => s.toggleHardBook);
  const [tab, setTab] = useState<"hard" | "wrong">("wrong");
  const [items, setItems] = useState<{ state: WordState; word: WordEntry }[]>([]);
  const [histWord, setHistWord] = useState<WordEntry | null>(null);

  useEffect(() => {
    if (!lib) return;
    (async () => {
      const states = tab === "hard" ? await getHardBook(lib.id) : await getWrongBook(lib.id);
      const words = await getAllWords(lib.id);
      const map = new Map(words.map((w) => [w.wordId, w]));
      setItems(states.map((s) => ({ state: s, word: map.get(s.wordId)! })).filter((x) => x.word));
    })();
  }, [lib?.id, tab]);

  if (!lib) return <div className="empty"><div className="ico">📕</div><p>请先选择词库</p></div>;

  const doExport = async () => {
    const csv = await exportBook(tab);
    if (!csv) return;
    downloadFile(`${lib.name}_${tab === "hard" ? "生词本" : "错题本"}.csv`, csv);
  };

  return (
    <>
      <div className="section-title" style={{ gap: 8 }}>
        <span style={{ display: "flex", gap: 8 }}>
          <span style={{ cursor: "pointer", color: tab === "wrong" ? "var(--primary)" : "var(--text-mute)", fontWeight: tab === "wrong" ? 600 : 400 }} onClick={() => setTab("wrong")}>错题本</span>
          <span style={{ color: "var(--text-mute)" }}>|</span>
          <span style={{ cursor: "pointer", color: tab === "hard" ? "var(--primary)" : "var(--text-mute)", fontWeight: tab === "hard" ? 600 : 400 }} onClick={() => setTab("hard")}>生词本</span>
        </span>
        <span style={{ fontSize: 11, color: "var(--text-mute)" }}>{items.length} 词</span>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <div className="ico">{tab === "hard" ? "✨" : "✅"}</div>
          <h2 style={{ fontSize: 18, color: "var(--text)" }}>{tab === "hard" ? "生词本为空" : "错题本为空"}</h2>
          <p>{tab === "hard" ? "点击单词卡片 ☆ 加入生词本" : "答错的词会自动加入"}</p>
        </div>
      ) : (
        <>
          <div className="btn-row" style={{ marginBottom: 10 }}>
            <button className="btn primary" style={{ flex: 1 }} onClick={() => startHardOrWrong(tab)}>📚 批量复习</button>
            <button className="btn ghost" style={{ flex: 1 }} onClick={doExport}>⬇ 导出 CSV</button>
          </div>
          <div className="word-list">
            {items.map(({ state, word }) => (
              <div key={word.wordId} className="word-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setHistWord(word)}>
                    <div className="w">{word.word} {word.kana && <span style={{ fontSize: 12, color: "var(--text-mute)" }}>{word.kana}</span>}</div>
                    <div className="m">{word.meaning}</div>
                  </div>
                  {tab === "wrong" ? (
                    <span className="tag">错 {state.wrongCount} 次</span>
                  ) : (
                    <button className="del" style={{ border: "none", background: "transparent", color: "var(--accent)", fontSize: 16, cursor: "pointer" }} onClick={() => { toggleHard(word.wordId, false); }} title="移出生词本">★</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {histWord && <HistoryOverlay word={histWord} libId={lib.id} onClose={() => setHistWord(null)} />}
    </>
  );
}

function HistoryOverlay({ word, libId, onClose }: { word: WordEntry; libId: string; onClose: () => void }) {
  const [state, setState] = useState<WordState | null>(null);
  useEffect(() => { getState(libId, word.wordId).then(setState); }, [word.wordId, libId]);
  return (
    <Overlay onClose={onClose}>
      <h3>复习历史</h3>
      <div className="word-card" style={{ padding: 14, marginBottom: 8 }}>
        <div className="word">{word.word}</div>
        {word.kana && <div className="kana">{word.kana}</div>}
        <div className="meaning">{word.meaning}</div>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-sub)", marginBottom: 6 }}>
        熟练度 {state?.proficiency ?? 0}/5 · 复习 {state?.reps ?? 0} 次 · 遗忘 {state?.lapses ?? 0} 次
      </div>
      <div className="timeline">
        {(state?.history || []).slice().reverse().map((h, i) => (
          <div key={i} className="row">
            <div className={`dot ${h.correct ? "ok" : "bad"}`} />
            <div style={{ flex: 1 }}>{new Date(h.t).toLocaleString("zh-CN")}</div>
            <div style={{ color: h.correct ? "var(--primary)" : "var(--danger)" }}>{h.correct ? "✓ 答对" : "✗ 答错"}{h.mode ? ` · ${h.mode}` : ""}</div>
          </div>
        ))}
        {(state?.history || []).length === 0 && <div style={{ color: "var(--text-mute)", fontSize: 12, padding: 8 }}>暂无复习记录</div>}
      </div>
      <button className="btn ghost" style={{ marginTop: 12 }} onClick={onClose}>关闭</button>
    </Overlay>
  );
}
