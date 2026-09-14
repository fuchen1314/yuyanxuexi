// pages/LibraryPage.tsx — 词库管理：列表 + 导入 + 词表浏览 + 重置
import { useState, useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { Overlay } from "../components/Overlay";
import { parseAny, autoDetectLang, dedupe, TEMPLATE_CSV_EN, TEMPLATE_CSV_JA, TEMPLATE_JSON_EN, TEMPLATE_JSON_JA } from "../utils/parse";
import { getAllWords } from "../db";
import { getStats } from "../srs/scheduler";
import type { WordEntry, Lang } from "../types";

export function LibraryPage() {
  const libs = useAppStore((s) => s.libraries);
  const currentId = useAppStore((s) => s.currentLibId);
  const select = useAppStore((s) => s.selectLibrary);
  const removeLib = useAppStore((s) => s.removeLibrary);
  const reset = useAppStore((s) => s.resetLibraryProgress);
  const register = useAppStore((s) => s.registerLibrary);
  const showToast = useAppStore((s) => s.showToast);
  const [importOpen, setImportOpen] = useState(false);
  const [browseId, setBrowseId] = useState<string | null>(null);

  if (browseId) return <BrowseView libId={browseId} onBack={() => setBrowseId(null)} />;

  if (!libs.length) {
    return (
      <div className="empty">
        <div className="ico">🗂</div>
        <h2 style={{ fontSize: 18, color: "var(--text)" }}>还没有任何词库</h2>
        <p style={{ marginBottom: 20 }}>导入词库开始背单词之旅</p>
        <button className="btn primary" style={{ maxWidth: 240, margin: "0 auto" }} onClick={() => setImportOpen(true)}>📥 导入词库</button>
        <ImportOverlay open={importOpen} onClose={() => setImportOpen(false)} onDone={() => setImportOpen(false)} />
      </div>
    );
  }
  return (
    <>
      <div className="section-title">我的词库</div>
      <div className="lib-list">
        {libs.map((l) => <LibRow key={l.id} lib={l} active={l.id === currentId} onSelect={() => select(l.id)} onBrowse={() => setBrowseId(l.id)} onReset={() => { if (confirm(`确认重置「${l.name}」的学习进度？所有记录将清空。`)) { reset(l.id); showToast("进度已重置"); } }} onDelete={() => { if (confirm(`确认删除词库「${l.name}」？`)) removeLib(l.id); }} />)}
      </div>
      <div className="section-title"></div>
      <button className="btn primary" onClick={() => setImportOpen(true)}>📥 导入新词库</button>
      <ImportOverlay open={importOpen} onClose={() => setImportOpen(false)} onDone={() => setImportOpen(false)} />
    </>
  );
}

function LibRow({ lib, active, onSelect, onBrowse, onReset, onDelete }: any) {
  const [pct, setPct] = useState(0);
  const [learned, setLearned] = useState(0);
  useEffect(() => { getStats(lib.id).then((s) => { const ln = s.mastered + s.learning + s.review; setLearned(ln); setPct(lib.total > 0 ? Math.round((ln / lib.total) * 100) : 0); }); }, [lib.id]);
  const flag = (l: Lang) => (l === "en" ? "🇬🇧" : l === "ja" ? "🇯🇵" : "🌐");
  return (
    <div className={`lib-row ${active ? "active" : ""}`}>
      <div className="flag" onClick={onSelect}>{flag(lib.lang)}</div>
      <div className="info" onClick={onSelect}>
        <div className="name">{lib.name} {lib.level && <span style={{ fontSize: 11, color: "var(--text-mute)", fontWeight: 400 }}>{lib.level}</span>}</div>
        <div className="meta">{learned}/{lib.total} 词 · 自定义</div>
      </div>
      <div className="prog" onClick={onBrowse} title="浏览词表">
        <svg width="50" height="50" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="none" stroke="#EDEFF2" strokeWidth="4" />
          <circle cx="25" cy="25" r="20" fill="none" stroke="#4CAF8F" strokeWidth="4" strokeDasharray={`${(pct / 100) * 125.6} 125.6`} strokeLinecap="round" />
        </svg>
        <span className="pct">{pct}%</span>
      </div>
      <button className="del" onClick={onReset} title="重置进度">↺</button>
      <button className="del" onClick={onDelete} title="删除">✕</button>
    </div>
  );
}

function BrowseView({ libId, onBack }: { libId: string; onBack: () => void }) {
  const [words, setWords] = useState<WordEntry[]>([]);
  useEffect(() => { getAllWords(libId).then(setWords); }, [libId]);
  return (
    <>
      <div className="section-title">词表浏览 <span style={{ fontSize: 11, color: "var(--text-mute)" }}>{words.length} 词</span></div>
      <button className="btn ghost" style={{ width: "auto", marginBottom: 10 }} onClick={onBack}>← 返回</button>
      <div className="word-list">
        {words.map((w) => (
          <div key={w.wordId} className="word-item">
            <div style={{ flex: 1 }}>
              <div className="w">{w.word} {w.kana && <span style={{ fontSize: 12, color: "var(--text-mute)" }}>{w.kana}</span>}</div>
              <div className="m">{w.meaning}</div>
            </div>
            {w.pos && <span className="tag">{w.pos}</span>}
          </div>
        ))}
      </div>
    </>
  );
}

function ImportOverlay({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const register = useAppStore((s) => s.registerLibrary);
  const showToast = useAppStore((s) => s.showToast);
  const [name, setName] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [level, setLevel] = useState("");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<WordEntry[] | null>(null);
  const [detected, setDetected] = useState<Lang>("other");
  const [dedup, setDedup] = useState(0);
  const [tpl, setTpl] = useState(TEMPLATE_CSV_EN);

  if (!open) return null;
  const doPreview = () => {
    try {
      let ws = parseAny(text || "", "__p__");
      const before = ws.length;
      ws = dedupe(ws);
      setPreview(ws.slice(0, 10));
      setDedup(before - ws.length);
      const d = autoDetectLang(ws);
      setDetected(d);
      setLang(d);
      showToast(`识别到 ${ws.length} 词（去重 ${before - ws.length}）`, "info");
    } catch (e) { showToast("解析失败：" + (e as Error).message, "error"); setPreview(null); }
  };
  const doImport = async () => {
    if (!name.trim()) { showToast("请填写词库名称", "error"); return; }
    if (!text.trim()) { showToast("请提供内容", "error"); return; }
    try {
      let ws = parseAny(text, "__p__");
      ws = dedupe(ws);
      if (!ws.length) { showToast("未解析到词条", "error"); return; }
      const lib = await register(name.trim(), lang, level.trim(), ws);
      showToast(`已导入「${lib.name}」，共 ${lib.total} 词`);
      setName(""); setText(""); setPreview(null); setLevel("");
      onDone();
    } catch (e) { showToast("导入失败：" + (e as Error).message, "error"); }
  };
  const onFile = async (f: File) => { setText(await f.text()); };
  return (
    <Overlay onClose={onClose}>
      <h3>📥 导入词库</h3>
      <p style={{ fontSize: 12, color: "var(--text-sub)" }}>支持 JSON / CSV（含 BOM，Excel 导出可直接用）</p>
      <label>词库名称</label>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：高考3500" />
      <label>语言</label>
      <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
        <option value="en">🇬🇧 英语</option>
        <option value="ja">🇯🇵 日语</option>
        <option value="other">🌐 其他</option>
      </select>
      <label>级别/标签（可选）</label>
      <input type="text" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="例如：N3 / CET4" />
      <label>选择文件（.json/.csv/.txt）</label>
      <input type="file" accept=".json,.csv,.txt" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} style={{ fontSize: 13, padding: 8 }} />
      <label>或粘贴文本</label>
      <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="粘贴 CSV 或 JSON 内容" />
      <div className="btn-row">
        <button className="btn ghost" style={{ flex: 1 }} onClick={doPreview}>👁 预览前 10 条</button>
        <button className="btn primary" style={{ flex: 1 }} onClick={doImport}>导入</button>
      </div>
      {preview && (
        <div style={{ background: "var(--bg)", borderRadius: 10, padding: 10, fontSize: 12 }}>
          <div style={{ color: "var(--text-sub)", marginBottom: 6 }}>检测语言：{detected === "ja" ? "日语" : detected === "en" ? "英语" : "其他"} · 去重 {dedup}</div>
          {preview.map((w, i) => (
            <div key={i} style={{ padding: "4px 0", borderBottom: "1px dashed var(--border)" }}>
              <b>{w.word}</b> {w.kana && <span style={{ color: "var(--text-mute)" }}>{w.kana}</span>} — {w.meaning}
            </div>
          ))}
        </div>
      )}
      <details style={{ marginTop: 8 }}>
        <summary style={{ fontSize: 12, color: "var(--text-sub)", cursor: "pointer", padding: 8 }}>📋 查看模板</summary>
        <div className="btn-row" style={{ marginTop: 8 }}>
          {(["csv-en", "csv-ja", "json-en", "json-ja"] as const).map((k) => (
            <button key={k} className="btn ghost" style={{ flex: 1, fontSize: 11, padding: 6 }} onClick={() => setTpl({ "csv-en": TEMPLATE_CSV_EN, "csv-ja": TEMPLATE_CSV_JA, "json-en": TEMPLATE_JSON_EN, "json-ja": TEMPLATE_JSON_JA }[k])}>
              {k === "csv-en" ? "英CSV" : k === "csv-ja" ? "日CSV" : k === "json-en" ? "英JSON" : "日JSON"}
            </button>
          ))}
        </div>
        <pre style={{ background: "var(--bg)", padding: 10, borderRadius: 8, fontSize: 11, overflowX: "auto", maxHeight: 180, whiteSpace: "pre-wrap", marginTop: 8 }}>{tpl}</pre>
      </details>
    </Overlay>
  );
}
