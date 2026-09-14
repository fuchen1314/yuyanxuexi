// pages/SettingsPage.tsx — 导出/导入进度、每日目标、发音语言、清空数据
import { useState, useRef } from "react";
import { useAppStore } from "../store/useAppStore";
import { Overlay } from "../components/Overlay";
import { downloadFile } from "../utils/misc";

export function SettingsPage() {
  const lib = useAppStore((s) => s.currentLib);
  const settings = useAppStore((s) => s.settings);
  const saveSettings = useAppStore((s) => s.saveSettings);
  const doExport = useAppStore((s) => s.doExport);
  const doImport = useAppStore((s) => s.doImport);
  const doClearAll = useAppStore((s) => s.doClearAll);
  const showToast = useAppStore((s) => s.showToast);
  const setView = useAppStore((s) => s.setView);
  const [goal, setGoal] = useState(settings?.dailyGoal || 20);
  const importRef = useRef<HTMLInputElement>(null);

  const saveGoal = async () => {
    const n = Number(goal);
    if (!n || n < 1) { showToast("请输入有效数字", "error"); return; }
    await saveSettings({ dailyGoal: n });
    showToast("已保存每日目标");
  };
  const exportNow = async () => {
    const json = await doExport();
    downloadFile(`zhanci-backup-${new Date().toISOString().slice(0, 10)}.json`, json, "application/json");
    showToast("已导出进度");
  };
  const importNow = async (f: File) => {
    try {
      const text = await f.text();
      await doImport(text);
      showToast("进度已恢复");
      setView("home");
    } catch (e) { showToast("导入失败：" + (e as Error).message, "error"); }
  };
  const clear = async () => {
    if (!confirm("确认清空所有数据？此操作不可恢复！建议先导出备份。")) return;
    await doClearAll();
    showToast("已清空全部数据");
  };

  return (
    <>
      <div className="stats-card">
        <h3>⚙️ {lib ? `${lib.name} · 每日目标` : "每日目标"}</h3>
        <label style={{ fontSize: 13, color: "var(--text-sub)" }}>每日新词数</label>
        <div className="btn-row" style={{ marginTop: 8 }}>
          <input type="number" min={1} max={500} value={goal} onChange={(e) => setGoal(Number(e.target.value))} style={{ flex: 1, padding: 10, border: "1px solid var(--border)", borderRadius: 10, fontSize: 15, background: "var(--bg)" }} />
          <button className="btn primary" style={{ width: "auto", flex: 0 }} onClick={saveGoal}>保存</button>
        </div>
      </div>

      <div className="stats-card">
        <h3>💾 备份与恢复</h3>
        <p style={{ fontSize: 12, color: "var(--text-sub)", marginBottom: 10 }}>导出所有词库的完整进度为 JSON 文件，换电脑/清缓存后可恢复。</p>
        <button className="btn primary" onClick={exportNow}>⬇ 导出全部进度</button>
        <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => importRef.current?.click()}>⬆ 导入进度恢复</button>
        <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && importNow(e.target.files[0])} />
      </div>

      <div className="stats-card">
        <h3>🔊 发音</h3>
        <p style={{ fontSize: 12, color: "var(--text-sub)" }}>使用浏览器 Web Speech API，英语 en-US、日语 ja-JP（日语按假名发音）。发音质量取决于系统语音库。</p>
      </div>

      <div className="stats-card">
        <h3>⚠️ 危险操作</h3>
        <p style={{ fontSize: 12, color: "var(--text-sub)", marginBottom: 10 }}>清空所有词库、学习记录、设置（不可恢复）。</p>
        <button className="btn danger" onClick={clear}>🗑 清空全部数据</button>
      </div>
    </>
  );
}
