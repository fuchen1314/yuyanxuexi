// db/index.ts — localforage 封装的多 store 数据层
// 使用 IndexedDB，按 store 分别配置 localforage 实例
import localforage from "localforage";
import type {
  LibraryMeta, WordEntry, WordState, LibSettings, DailyLog,
} from "../types";
import { parseAny, autoDetectLang, dedupe } from "../utils/parse";
import { BUILTIN_LIBS, BUILTIN_LIBS_VERSION, type BuiltinLibDef } from "../data/builtinLibs";

// 配置：一个 driver，多个 store
localforage.config({ name: "zhanci", driver: localforage.INDEXEDDB });

const libStore = localforage.createInstance({ name: "zhanci", storeName: "libraries" });
const wordStore = localforage.createInstance({ name: "zhanci", storeName: "libraryWords" });
const stateStore = localforage.createInstance({ name: "zhanci", storeName: "words" });
const settingsStore = localforage.createInstance({ name: "zhanci", storeName: "meta" });
const logStore = localforage.createInstance({ name: "zhanci", storeName: "logs" });

const key = (libId: string, wordId: number | string) => `${libId}:${wordId}`;

// ====== 内置词库载入 ======
const BUILTIN_FLAG_KEY = "__builtin_loaded_version__";

// 检查内置词库是否需要（重新）载入
export async function getBuiltinLoadedVersion(): Promise<number> {
  return (await settingsStore.getItem<number>(BUILTIN_FLAG_KEY)) || 0;
}
async function setBuiltinLoadedVersion(v: number) {
  await settingsStore.setItem(BUILTIN_FLAG_KEY, v);
}

// 从 public 目录 fetch 一个 CSV 词库文件
async function fetchBuiltinFile(file: string): Promise<string> {
  // 兼容子路径部署：用相对路径
  const url = (import.meta.env.BASE_URL || "/") + file.replace(/^\//, "");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`加载词库失败：${file} (${res.status})`);
  return await res.text();
}

// 把一个内置词库定义载入 IndexedDB（如已存在则跳过，除非 force）
async function loadOneBuiltin(def: BuiltinLibDef, force = false) {
  // 检查是否已存在
  const existing = await libStore.getItem<LibraryMeta>(def.id);
  if (existing && !force) return existing;
  // 抓文件
  const text = await fetchBuiltinFile(def.file);
  // 解析 + 去重
  let words = parseAny(text, def.id);
  words = dedupe(words);
  if (!words.length) throw new Error(`词库 ${def.name} 解析后为空`);
  // 元信息
  const lib: LibraryMeta = {
    id: def.id,
    name: def.name,
    lang: def.lang,
    level: def.level,
    type: "builtin",
    total: words.length,
    createdAt: Date.now(),
  };
  await libStore.setItem(def.id, lib);
  // 词条
  for (const w of words) {
    await wordStore.setItem(key(def.id, w.wordId), { ...w, libId: def.id });
  }
  // 初始化状态
  for (const w of words) {
    const k = key(def.id, w.wordId);
    if (!(await stateStore.getItem(k))) {
      await stateStore.setItem(k, newState(def.id, w.wordId));
    }
  }
  await ensureSettings(def.id);
  return lib;
}

// 启动时调用：确保所有内置词库已载入（版本不匹配则全部重新载入）
export async function ensureBuiltinLibs(): Promise<{ loaded: number; skipped: boolean }> {
  const v = await getBuiltinLoadedVersion();
  if (v === BUILTIN_LIBS_VERSION) {
    // 检查是否真的都在（可能用户清过部分数据）
    const all = await listLibraries();
    const missing = BUILTIN_LIBS.some((d) => !all.find((l) => l.id === d.id));
    if (!missing) return { loaded: 0, skipped: true };
  }
  // 需要载入（首次或版本升级或部分缺失）
  let count = 0;
  for (const def of BUILTIN_LIBS) {
    try {
      // 已存在的不强制覆盖（保留用户进度）；只补缺失的
      const exists = await libStore.getItem<LibraryMeta>(def.id);
      if (!exists) {
        await loadOneBuiltin(def, false);
        count++;
      }
    } catch (e) {
      console.warn(`内置词库 ${def.name} 载入失败：`, e);
    }
  }
  await setBuiltinLoadedVersion(BUILTIN_LIBS_VERSION);
  return { loaded: count, skipped: false };
}

// 强制重新载入某个内置词库（保留状态，只重读文件——用于词库内容更新）
export async function reloadBuiltinLib(def: BuiltinLibDef) {
  await loadOneBuiltin(def, true);
}

// ====== 词库 ======
export async function listLibraries(): Promise<LibraryMeta[]> {
  const out: LibraryMeta[] = [];
  await libStore.iterate<LibraryMeta, void>((v) => { out.push(v); });
  return out.sort((a, b) => a.createdAt - b.createdAt);
}
export async function getLibrary(id: string) { return libStore.getItem<LibraryMeta>(id); }
export async function putLibrary(lib: LibraryMeta) { await libStore.setItem(lib.id, lib); }
export async function deleteLibrary(id: string) {
  await libStore.removeItem(id);
  // 级联：收集各 store 中属于该词库的 key，再删除（避免边遍历边删）
  const wKeys: string[] = [];
  await wordStore.iterate<WordEntry, void>((v, k) => { if (v && v.libId === id) wKeys.push(k); });
  for (const k of wKeys) await wordStore.removeItem(k);
  const sKeys: string[] = [];
  await stateStore.iterate<WordState, void>((v, k) => { if (v && v.libId === id) sKeys.push(k); });
  for (const k of sKeys) await stateStore.removeItem(k);
  await settingsStore.removeItem(id);
  const lKeys: string[] = [];
  await logStore.iterate<DailyLog, void>((v, k) => { if (v && v.libId === id) lKeys.push(k); });
  for (const k of lKeys) await logStore.removeItem(k);
}

// ====== 词条 ======
export async function putWord(w: WordEntry) { await wordStore.setItem(key(w.libId, w.wordId), w); }
export async function bulkPutWords(ws: WordEntry[]) {
  for (const w of ws) await wordStore.setItem(key(w.libId, w.wordId), w);
}
export async function getWord(libId: string, wordId: number) {
  return wordStore.getItem<WordEntry>(key(libId, wordId));
}
export async function getAllWords(libId: string): Promise<WordEntry[]> {
  const out: WordEntry[] = [];
  await wordStore.iterate<WordEntry, void>((v) => { if (v && v.libId === libId) out.push(v); });
  return out.sort((a, b) => a.wordId - b.wordId);
}

// ====== 单词状态 ======
export function newState(libId: string, wordId: number): WordState {
  return {
    key: key(libId, wordId), libId, wordId,
    status: "new", proficiency: 0, interval: 0, due: 0,
    reps: 0, lapses: 0, lastReviewed: 0,
    history: [], wrongCount: 0, inWrongBook: false, wrongAt: 0,
    inHardBook: false,
  };
}
export async function getState(libId: string, wordId: number) {
  return stateStore.getItem<WordState>(key(libId, wordId));
}
export async function putState(s: WordState) { await stateStore.setItem(s.key, s); }
export async function bulkInitStates(libId: string, ids: number[]) {
  for (const id of ids) {
    const k = key(libId, id);
    if (!(await stateStore.getItem(k))) await stateStore.setItem(k, newState(libId, id));
  }
}
export async function getAllStates(libId: string): Promise<WordState[]> {
  const out: WordState[] = [];
  await stateStore.iterate<WordState, void>((v) => { if (v && v.libId === libId) out.push(v); });
  return out;
}
export async function getStatesByStatus(libId: string, status: WordState["status"]) {
  const all = await getAllStates(libId);
  return all.filter((s) => s.status === status);
}
export async function getWrongBook(libId: string) {
  const all = await getAllStates(libId);
  return all.filter((s) => s.inWrongBook).sort((a, b) => b.wrongAt - a.wrongAt);
}
export async function getHardBook(libId: string) {
  const all = await getAllStates(libId);
  return all.filter((s) => s.inHardBook).sort((a, b) => b.wordId - a.wordId);
}

// ====== 设置/打卡 ======
export async function getSettings(libId: string) {
  return settingsStore.getItem<LibSettings>(libId);
}
export async function putSettings(s: LibSettings) { await settingsStore.setItem(s.libId, s); }
export async function ensureSettings(libId: string) {
  let s = await getSettings(libId);
  if (!s) {
    s = {
      libId, dailyGoal: 20, lastStudyDate: null, streak: 0,
      todayStudied: 0, todayDate: null,
      resumeWordId: null, resumeMode: null, resumeTs: null,
    };
    await putSettings(s);
  }
  return s;
}

// ====== 日志 ======
function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function today() { return todayStr(); }
export async function getLog(libId: string, date: string) {
  return logStore.getItem<DailyLog>(`${libId}:${date}`);
}
export async function putLog(l: DailyLog) { await logStore.setItem(l.key, l); }
export async function listLogs(libId: string): Promise<DailyLog[]> {
  const out: DailyLog[] = [];
  await logStore.iterate<DailyLog, void>((v) => { if (v && v.libId === libId) out.push(v); });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// ====== 全部导出/导入（备份） ======
export async function exportAll() {
  const data: Record<string, any[]> = { libraries: [], libraryWords: [], words: [], meta: [], logs: [] };
  await libStore.iterate<LibraryMeta, void>((v) => data.libraries.push(v));
  await wordStore.iterate<WordEntry, void>((v) => data.libraryWords.push(v));
  await stateStore.iterate<WordState, void>((v) => data.words.push(v));
  await settingsStore.iterate<LibSettings, void>((v) => data.meta.push(v));
  await logStore.iterate<DailyLog, void>((v) => data.logs.push(v));
  return { version: 2, exportedAt: Date.now(), data };
}

export async function importAll(payload: any) {
  const d = payload?.data;
  if (!d) throw new Error("备份文件格式无效");
  await libStore.clear();
  await wordStore.clear();
  await stateStore.clear();
  await settingsStore.clear();
  await logStore.clear();
  for (const lib of d.libraries || []) await libStore.setItem(lib.id, lib);
  for (const w of d.libraryWords || []) await wordStore.setItem(w.key, w);
  for (const s of d.words || []) await stateStore.setItem(s.key, s);
  for (const m of d.meta || []) await settingsStore.setItem(m.libId, m);
  for (const l of d.logs || []) await logStore.setItem(l.key, l);
}

export async function clearAll() {
  await libStore.clear();
  await wordStore.clear();
  await stateStore.clear();
  await settingsStore.clear();
  await logStore.clear();
}
