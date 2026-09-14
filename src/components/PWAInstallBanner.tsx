// components/PWAInstallBanner.tsx — PWA 安装引导横幅
import { usePWA } from "../hooks/usePWA";

export function PWAInstallBanner() {
  const { canInstall, installed, updateAvailable, promptInstall, applyUpdate } = usePWA();

  if (updateAvailable) {
    return (
      <div style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: "var(--maxw, 720px)", zIndex: 300,
        background: "var(--warn)", color: "#fff", padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 10, fontSize: 13,
      }}>
        <span style={{ flex: 1 }}>🔄 发现新版本，点击更新</span>
        <button onClick={applyUpdate} style={{
          border: "none", background: "rgba(255,255,255,.25)", color: "#fff",
          padding: "6px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 600,
        }}>立即更新</button>
      </div>
    );
  }

  if (installed || !canInstall) return null;

  return (
    <div style={{
      position: "fixed", bottom: "calc(var(--tab-h) + 12px)", left: "50%",
      transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: "var(--maxw, 720px)",
      zIndex: 200, background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 16, padding: "14px 16px", boxShadow: "var(--shadow-lg)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <img src="icons/icon-512.jpg" alt="斩词" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>安装「斩词」到桌面</div>
        <div style={{ fontSize: 11, color: "var(--text-mute)" }}>离线可用，像 App 一样使用</div>
      </div>
      <button onClick={promptInstall} style={{
        border: "none", background: "var(--primary)", color: "#fff",
        padding: "8px 16px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 600,
      }}>安装</button>
    </div>
  );
}
