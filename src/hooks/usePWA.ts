// hooks/usePWA.ts — PWA 安装提示 + Service Worker 更新检测
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWA() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // 检查是否已安装为 PWA
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setInstalled(true);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    // SW 更新检测：监听 main.tsx 派发的自定义事件
    const onSWUpdate = () => setUpdateAvailable(true);
    window.addEventListener("sw-update-ready", onSWUpdate);

    // 定时检查 SW 更新
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        const checkInterval = setInterval(() => reg.update(), 60 * 60 * 1000);
        // 也立即检查一次
        reg.update();
        return () => clearInterval(checkInterval);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("sw-update-ready", onSWUpdate);
    };
  }, []);

  const promptInstall = async () => {
    if (!installEvent) return false;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setInstallEvent(null);
    }
    return true;
  };

  const applyUpdate = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.update());
      });
    }
    window.location.reload();
  };

  return {
    canInstall: !!installEvent && !installed,
    installed,
    updateAvailable,
    promptInstall,
    applyUpdate,
  };
}
