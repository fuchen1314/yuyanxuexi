// App.tsx — 根组件：初始化 + 路由 + 顶部菜单
import { useEffect, useState } from "react";
import { useAppStore } from "./store/useAppStore";
import { TopBar } from "./components/TopBar";
import { BottomNav } from "./components/BottomNav";
import { Toast } from "./components/Toast";
import { Overlay } from "./components/Overlay";
import { ImportOverlay } from "./components/ImportOverlay";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import { HomePage } from "./pages/HomePage";
import { LearnPage } from "./pages/LearnPage";
import { ReviewPage } from "./pages/ReviewPage";
import { LibraryPage } from "./pages/LibraryPage";
import { WordBookPage } from "./pages/WordBookPage";
import { StatsPage } from "./pages/StatsPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  const ready = useAppStore((s) => s.ready);
  const view = useAppStore((s) => s.view);
  const init = useAppStore((s) => s.init);
  const setView = useAppStore((s) => s.setView);
  const [menu, setMenu] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => { init(); }, []);

  if (!ready) {
    return <div className="app"><div className="empty"><div className="ico">📚</div><p>加载中…</p></div></div>;
  }

  return (
    <div className="app">
      <TopBar onMenu={() => setMenu(true)} />
      <main className="main">
        {view === "home" && <HomePage onImport={() => setImportOpen(true)} />}
        {view === "learn" && <LearnPage />}
        {view === "review" && <ReviewPage />}
        {view === "library" && <LibraryPage />}
        {view === "wordbook" && <WordBookPage />}
        {view === "stats" && <StatsPage />}
        {view === "settings" && <SettingsPage />}
      </main>
      <BottomNav />
      <Toast />
      <PWAInstallBanner />

      {menu && (
        <Overlay onClose={() => setMenu(false)}>
          <h3>菜单</h3>
          <button onClick={() => { setMenu(false); setView("library"); }}>🗂 词库管理</button>
          <button onClick={() => { setMenu(false); setImportOpen(true); }}>📥 导入词库</button>
          <button onClick={() => { setMenu(false); setView("settings"); }}>⚙️ 设置</button>
          <button onClick={() => { setMenu(false); setView("stats"); }}>📊 统计</button>
          <button className="ghost" onClick={() => setMenu(false)}>关闭</button>
        </Overlay>
      )}

      <ImportOverlay open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
