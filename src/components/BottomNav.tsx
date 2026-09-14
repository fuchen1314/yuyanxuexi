// components/BottomNav.tsx — 底部 5 tab 导航
import { useAppStore } from "../store/useAppStore";
import type { View } from "../types";
const ITEMS: { v: View; icon: string; label: string }[] = [
  { v: "home", icon: "🏠", label: "首页" },
  { v: "learn", icon: "📖", label: "学习" },
  { v: "review", icon: "🔁", label: "复习" },
  { v: "wordbook", icon: "📕", label: "生词" },
  { v: "stats", icon: "📊", label: "统计" },
];
export function BottomNav() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  return (
    <nav className="bottom-nav">
      {ITEMS.map((it) => (
        <button key={it.v} className={`nav-item ${view === it.v ? "active" : ""}`} onClick={() => setView(it.v)}>
          {it.icon}<span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
