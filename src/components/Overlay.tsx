// components/Overlay.tsx — 通用底部浮层
import type { ReactNode } from "react";
export function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
