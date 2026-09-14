// components/TopBar.tsx — 顶部品牌 + 词库切换器 + 菜单
import { useAppStore } from "../store/useAppStore";
const flag = (l: string) => (l === "en" ? "🇬🇧" : l === "ja" ? "🇯🇵" : "🌐");
export function TopBar({ onMenu }: { onMenu: () => void }) {
  const libs = useAppStore((s) => s.libraries);
  const currentId = useAppStore((s) => s.currentLibId);
  const select = useAppStore((s) => s.selectLibrary);
  return (
    <header className="topbar">
      <div className="brand"><span className="logo">📚</span><span>斩词</span></div>
      <div className="lib-selector">
        {libs.length === 0 ? (
          <span style={{ fontSize: 12, color: "var(--text-mute)", padding: "6px 0" }}>尚无词库，点击右上角导入</span>
        ) : libs.map((l) => (
          <div key={l.id} className={`lib-chip ${l.id === currentId ? "active" : ""}`} onClick={() => select(l.id)}>
            {flag(l.lang)} {l.name}
          </div>
        ))}
      </div>
      <button className="icon-btn" onClick={onMenu} title="菜单">☰</button>
    </header>
  );
}
