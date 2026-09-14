// components/ImportOverlay.tsx — 共享导入浮层（首页/菜单/词库页通用）
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Overlay } from "./Overlay";
import { parseAny, autoDetectLang, dedupe, TEMPLATE_CSV_EN, TEMPLATE_CSV_JA, TEMPLATE_JSON_EN, TEMPLATE_JSON_JA } from "../utils/parse";
import type { WordEntry, Lang } from "../types";

export function ImportOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      showToast(`识别到 ${ws.length} 词（去重 ${before - ws.length}）`);
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
      onClose();
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
        <button className="btn ghost" style={{ flex: 1 }} onClick={doPreview}>👁 预览</button>
        <button className="btn primary" style={{ flex: 1 }} onClick={doImport}>导入</button>
      </div>
      {preview && (
        <div style={{ background: "var(--bg)", borderRadius: 10, padding: 10, fontSize: 12 }}>
          <div style={{ color: "var(--text-sub)", marginBottom: 6 }}>检测：{detected === "ja" ? "日语" : detected === "en" ? "英语" : "其他"} · 去重 {dedup}</div>
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
