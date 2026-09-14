// utils/misc.ts — TTS、shuffle、date、escape 等

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ====== TTS（修复 iOS Safari 兼容性） ======
let _voices: SpeechSynthesisVoice[] = [];
let _voicesLoaded = false;

function loadVoices() {
  if (!("speechSynthesis" in window)) return;
  const v = window.speechSynthesis.getVoices();
  if (v && v.length > 0) {
    _voices = v;
    _voicesLoaded = true;
  }
}

if ("speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
  // iOS 兜底：有时 onvoiceschanged 不触发，多次重试
  let retry = 0;
  const timer = setInterval(() => {
    loadVoices();
    retry++;
    if (_voicesLoaded || retry > 10) clearInterval(timer);
  }, 300);
}

// 等 voices 加载完成（iOS 必须）
async function ensureVoices(): Promise<boolean> {
  if (!("speechSynthesis" in window)) return false;
  if (_voicesLoaded && _voices.length > 0) return true;
  // 触发一次加载
  loadVoices();
  if (_voices.length > 0) { _voicesLoaded = true; return true; }
  // 等待 onvoiceschanged
  return new Promise((resolve) => {
    let waited = 0;
    const check = setInterval(() => {
      waited += 100;
      loadVoices();
      if (_voices.length > 0 || waited > 3000) {
        clearInterval(check);
        resolve(_voices.length > 0);
      }
    }, 100);
  });
}

export async function speak(text: string, lang: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    await ensureVoices();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "ja" ? "ja-JP" : lang === "en" ? "en-US" : "zh-CN";
    u.rate = lang === "ja" ? 0.85 : 0.9;
    u.pitch = 1;
    // 优先选匹配语言的 voice（iOS 上必须选到合适的 voice 才能出声）
    let v = _voices.find((x) => x.lang && x.lang.toLowerCase().startsWith(u.lang!.toLowerCase().slice(0, 2)));
    if (!v) v = _voices.find((x) => x.lang && x.lang.toLowerCase().includes(u.lang!.toLowerCase()));
    if (v) u.voice = v;
    // iOS: cancel 后必须等一下才能 speak
    window.speechSynthesis.cancel();
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(u);
      } catch { /* ignore */ }
    }, 50);
  } catch { /* ignore */ }
}

export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatTime(sec: number): string {
  if (sec < 60) return `${sec} 秒`;
  return `${Math.floor(sec / 60)} 分`;
}

export function escapeHTML(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// 下载文本文件
export function downloadFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 数组转 CSV
export function toCSV(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((c) => {
    const s = String(c ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
}
