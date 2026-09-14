// db/index.ts — localforage 封装的多 store 数据层
// 使用 IndexedDB，按 store 分别配置 localforage 实例
import localforage from "localforage";
import type {
  LibraryMeta, WordEntry, WordState, LibSettings, DailyLog,
} from "../types";

// 配置：一个 driver，多个 store
localforage.config({ name: "zhanci", driver: localforage.INDEXEDDB });

const libStore = localforage.createInstance({ name: "zhanci", storeName: "libraries" });
const wordStore = localforage.createInstance({ name: "zhanci", storeName: "libraryWords" });
const stateStore = localforage.createInstance({ name: "zhanci", storeName: "words" });
const settingsStore = localforage.createInstance({ name: "zhanci", storeName: "meta" });
const logStore = localforage.createInstance({ name: "zhanci", storeName: "logs" });

const key = (libId: string, wordId: number | string) => `${libId}:${wordId}`;

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
