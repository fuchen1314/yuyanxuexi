// components/Toast.tsx
import { useAppStore } from "../store/useAppStore";
export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const type = useAppStore((s) => s.toastType);
  if (!toast) return null;
  return <div className={`toast ${type === "error" ? "error" : ""}`}>{toast}</div>;
}
