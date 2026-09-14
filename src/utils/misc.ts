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
// 核心原则：speak 必须是同步函数！
// iOS Safari 用户点击事件的"手势上下文"在 await 后立即失效，
// 任何 async/await 都会导致 speak() 被静默拦截。
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

// 页面加载时触发 voices 加载；iOS 上 getVoices() 首次返回空，
// 等 onvoiceschanged 事件后才有值
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  // 兜底：3 秒内每 300ms 重试一次
  let retry = 0;
  const timer = setInterval(() => {
    loadVoices();
    retry++;
    if (_voicesLoaded || retry > 10) clearInterval(timer);
  }, 300);
}

// 选择最佳 voice（同步，不阻塞）
function pickVoice(targetLang: string): SpeechSynthesisVoice | undefined {
  if (!_voices.length) return undefined;
  // targetLang 形如 "en" / "ja" / "zh"
  const prefix = targetLang.toLowerCase().slice(0, 2);
  // 精确匹配（如 en-US / en-GB）
  let v = _voices.find((x) => x.lang && x.lang.toLowerCase().startsWith(prefix));
  if (!v) v = _voices.find((x) => x.lang && x.lang.toLowerCase().includes(prefix));
  return v;
}

// 同步 speak！不能加 async/await！
export function speak(text: string, lang: string) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // 确保 voices 已加载（同步触发）
    if (!_voicesLoaded) loadVoices();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "ja" ? "ja-JP" : lang === "en" ? "en-US" : "zh-CN";
    u.rate = lang === "ja" ? 0.85 : 0.9;
    u.pitch = 1;
    const v = pickVoice(u.lang);
    if (v) u.voice = v;
    // iOS: cancel 后 speak 会被吞，改用 cancel 后短暂延迟
    // 但关键是 speak 调用本身必须在当前同步调用栈里！
    window.speechSynthesis.cancel();
    // 用 setImmediate / setTimeout 0 让 cancel 生效，但不丢失手势上下文
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(u);
      } catch { /* ignore */ }
    }, 30);
  } catch { /* ignore */ }
}

// 诊断：输出当前可用 voices 列表（移动端调试点时用）
export function debugVoices(): string {
  if (!("speechSynthesis" in window)) return "no speechSynthesis";
  loadVoices();
  return _voices.map((v) => `${v.lang} ${v.name}`).join("\n") || "(empty)";
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
