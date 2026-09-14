// store/useAppStore.ts — Zustand 全局状态 + 数据操作
import { create } from "zustand";
import type {
  LibraryMeta, View, LearnSession, SessionItem, WordState, WordEntry,
  LibSettings, Lang, ReviewMode,
} from "../types";
import {
  listLibraries, getLibrary, putLibrary, deleteLibrary as dbDeleteLib,
  bulkPutWords, getAllWords, getAllStates, ensureSettings, putSettings,
  getSettings, newState, getState, putState, bulkInitStates,
  exportAll, importAll, clearAll, getWrongBook, getHardBook, today,
  getLog, putLog, ensureBuiltinLibs,
} from "../db";
import { applyAnswer, buildQueues, getStats } from "../srs/scheduler";
import { parseAny, autoDetectLang, dedupe } from "../utils/parse";
import { shuffle } from "../utils/misc";
import type { LibStats } from "../types";

interface AppState {
  // 持久/全局
  libraries: LibraryMeta[];
  currentLibId: string | null;
  currentLib: LibraryMeta | null;
  view: View;
  ready: boolean;
  toast: string | null;
  toastType: "info" | "error";
  // 当前词库设置 + 统计缓存
  settings: LibSettings | null;
  stats: LibStats | null;
  // 学习会话
  session: LearnSession | null;
  // 复习模式选择
  reviewMode: ReviewMode;
  reviewModeQueue: ReviewMode[];

  // actions
  init: () => Promise<void>;
  setView: (v: View) => void;
  selectLibrary: (libId: string) => Promise<void>;
  showToast: (msg: string, type?: "info" | "error") => void;
  refreshStats: () => Promise<void>;

  // 词库管理
  importLibrary: (name: string, lang: Lang, level: string, text: string) => Promise<{ ok: boolean; msg: string; preview?: WordEntry[] }>;
  previewImport: (text: string) => { words: WordEntry[]; lang: Lang; dedupCount: number };
  registerLibrary: (name: string, lang: Lang, level: string, words: WordEntry[]) => Promise<LibraryMeta>;
  removeLibrary: (libId: string) => Promise<void>;
  resetLibraryProgress: (libId: string) => Promise<void>;

  // 设置
  saveSettings: (patch: Partial<LibSettings>) => Promise<void>;

  // 备份
  doExport: () => Promise<string>;
  doImport: (json: string) => Promise<void>;
  doClearAll: () => Promise<void>;

  // 学习/复习会话
  startLearn: () => Promise<void>;
  startReview: (mode?: ReviewMode) => Promise<void>;
  startExtraReview: (n: number) => Promise<void>;
  startHardOrWrongReview: (which: "hard" | "wrong") => Promise<void>;
  answerChoice: (index: number) => Promise<void>;
  answerSpelling: (input: string) => Promise<void>;
  answerTrueFalse: (choice: boolean) => Promise<void>;
  nextCard: () => Promise<void>;
  learnNext: () => Promise<void>;   // 学习页展示流：标记已学 + 推进，结束后自动入复习
  saveResume: (wordId: number, mode: "learn" | "review") => Promise<void>;
  clearSession: () => void;

  // 错题本/生词本
  toggleHardBook: (wordId: number, add: boolean) => Promise<void>;
  exportBook: (which: "hard" | "wrong") => Promise<string>;
}

const REVIEW_MODES: ReviewMode[] = [
  "image-to-meaning", "meaning-to-word", "spelling", "listen-to-meaning", "true-false",
];

export const useAppStore = create<AppState>((set, get) => ({
  libraries: [],
  currentLibId: null,
  currentLib: null,
  view: "home",
  ready: false,
  toast: null,
  toastType: "info",
  settings: null,
  stats: null,
  session: null,
  reviewMode: "image-to-meaning",
  reviewModeQueue: [],

  init: async () => {
    // 先载入内置词库（首次启动或词库版本升级时）
    try {
      await ensureBuiltinLibs();
    } catch (e) {
      console.warn("内置词库载入失败：", e);
    }
    await checkDailyReset();
    const libs = await listLibraries();
    set({ libraries: libs, ready: true });
    const lastId = localStorage.getItem("zhanci:lib");
    const id = (lastId && libs.find((l) => l.id === lastId)) ? lastId : (libs[0]?.id || null);
    if (id) await get().selectLibrary(id);
    set({ ready: true });
  },

  setView: (v) => {
    set({ view: v, session: null });
  },

  selectLibrary: async (libId) => {
    const lib = await getLibrary(libId);
    const settings = await ensureSettings(libId);
    const stats = await getStats(libId);
    localStorage.setItem("zhanci:lib", libId);
    const cur = get().view;
    set({
      currentLibId: libId, currentLib: lib, settings, stats,
      session: null,
      view: (cur === "learn" || cur === "review") ? "home" : cur,
    });
  },

  showToast: (msg, type = "info") => {
    set({ toast: msg, toastType: type });
    setTimeout(() => set({ toast: null }), 2200);
  },

  refreshStats: async () => {
    const id = get().currentLibId;
    if (!id) return;
    const stats = await getStats(id);
    const settings = await ensureSettings(id);
    set({ stats, settings });
  },

  previewImport: (text) => {
    const tmpId = "__preview__";
    let words = parseAny(text, tmpId);
    const before = words.length;
    words = dedupe(words);
    const lang = autoDetectLang(words);
    return { words, lang, dedupCount: before - words.length };
  },

  importLibrary: async (name, lang, level, text) => {
    try {
      const { words, lang: detected } = get().previewImport(text);
      if (!words.length) return { ok: false, msg: "未解析到任何词条" };
      const lib = await get().registerLibrary(name, lang || detected, level, words);
      return { ok: true, msg: `已导入「${lib.name}」，共 ${lib.total} 词`, preview: words.slice(0, 10) };
    } catch (e) {
      return { ok: false, msg: "解析失败：" + (e as Error).message };
    }
  },

  registerLibrary: async (name, lang, level, words) => {
    const libId = `lib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const lib: LibraryMeta = {
      id: libId, name: name || "未命名词库",
      lang: lang || autoDetectLang(words), level: level || "",
      type: "custom", total: words.length, createdAt: Date.now(),
    };
    await putLibrary(lib);
    const entries = words.map((w) => ({ ...w, libId, key: `${libId}:${w.wordId}` }));
    await bulkPutWords(entries);
    await bulkInitStates(libId, words.map((w) => w.wordId));
    await ensureSettings(libId);
    const libs = await listLibraries();
    set({ libraries: libs });
    await get().selectLibrary(libId);
    return lib;
  },

  removeLibrary: async (libId) => {
    const lib = await getLibrary(libId);
    if (lib?.type === "builtin") {
      get().showToast("内置词库不可删除，可重置进度", "error");
      return;
    }
    await dbDeleteLib(libId);
    const libs = await listLibraries();
    set({ libraries: libs });
    if (get().currentLibId === libId) {
      const next = libs[0]?.id || null;
      if (next) await get().selectLibrary(next);
      else set({ currentLibId: null, currentLib: null, settings: null, stats: null, view: "home" });
    }
  },

  resetLibraryProgress: async (libId) => {
    const states = await getAllStates(libId);
    for (const s of states) {
      await putState(newState(libId, s.wordId));
    }
    const settings = await ensureSettings(libId);
    settings.streak = 0; settings.todayStudied = 0; settings.todayDate = today();
    settings.resumeWordId = null; settings.resumeMode = null; settings.resumeTs = null;
    settings.lastStudyDate = null;
    await putSettings(settings);
    await get().refreshStats();
  },

  saveSettings: async (patch) => {
    const id = get().currentLibId;
    if (!id) return;
    const s = await ensureSettings(id);
    Object.assign(s, patch);
    await putSettings(s);
    set({ settings: s });
  },

  doExport: async () => {
    const payload = await exportAll();
    return JSON.stringify(payload, null, 2);
  },

  doImport: async (json) => {
    const payload = JSON.parse(json);
    await importAll(payload);
    await get().init();
  },

  doClearAll: async () => {
    await clearAll();
    localStorage.removeItem("zhanci:lib");
    set({ libraries: [], currentLibId: null, currentLib: null, settings: null, stats: null, session: null, view: "home" });
  },

  // ====== 学习流程 ======
  startLearn: async () => {
    const id = get().currentLibId;
    if (!id) { get().showToast("请先选择词库", "error"); return; }
    const { newQueue, reviewQueue, learningQueue } = await buildQueues(id);
    const settings = await ensureSettings(id);
    const left = Math.max(0, settings.dailyGoal - (settings.todayStudied || 0));
    const freshToday = newQueue.slice(0, left);
    const queue = [...learningQueue, ...reviewQueue, ...freshToday];
    if (!queue.length) {
      get().showToast("今日任务已完成，无待学词");
      return;
    }
    const allWords = await getAllWords(id);
    const wmap = new Map(allWords.map((w) => [w.wordId, w]));
    const items: SessionItem[] = queue.map((s) => ({ state: s, word: wmap.get(s.wordId)! })).filter((x) => x.word);
    set({
      session: {
        queue: items, idx: 0, correct: 0, wrong: 0, newCount: 0, reviewCount: 0,
        isReview: false, answered: false, currentChoices: [], correctIndex: -1,
      },
      view: "learn",
    });
    await buildCurrentChoices();
  },

  startReview: async (mode) => {
    const id = get().currentLibId;
    if (!id) { get().showToast("请先选择词库", "error"); return; }
    const { reviewQueue, learningQueue } = await buildQueues(id);
    const queue = [...learningQueue, ...reviewQueue];
    if (!queue.length) { get().showToast("暂无待复习词"); return; }
    const allWords = await getAllWords(id);
    const wmap = new Map(allWords.map((w) => [w.wordId, w]));
    const items: SessionItem[] = queue.map((s) => ({ state: s, word: wmap.get(s.wordId)! })).filter((x) => x.word);
    const m = mode || get().reviewMode;
    set({
      session: {
        queue: items, idx: 0, correct: 0, wrong: 0, newCount: 0, reviewCount: 0,
        isReview: true, answered: false, currentChoices: [], correctIndex: -1,
      },
      reviewMode: m, view: "review",
    });
    await buildCurrentChoices();
  },

  startExtraReview: async (n) => {
    const id = get().currentLibId;
    if (!id) return;
    const states = await getAllStates(id);
    const learned = states.filter((s) => s.status !== "new");
    if (!learned.length) { get().showToast("暂无可复习的词"); return; }
    const sampled = shuffle(learned).slice(0, n);
    const allWords = await getAllWords(id);
    const wmap = new Map(allWords.map((w) => [w.wordId, w]));
    set({
      session: {
        queue: sampled.map((s) => ({ state: s, word: wmap.get(s.wordId)! })).filter((x) => x.word),
        idx: 0, correct: 0, wrong: 0, newCount: 0, reviewCount: 0,
        isReview: true, answered: false, currentChoices: [], correctIndex: -1,
      },
      reviewMode: get().reviewMode, view: "review",
    });
    await buildCurrentChoices();
  },

  startHardOrWrongReview: async (which) => {
    const id = get().currentLibId;
    if (!id) return;
    const states = which === "hard" ? await getHardBook(id) : await getWrongBook(id);
    if (!states.length) { get().showToast(which === "hard" ? "生词本为空" : "错题本为空"); return; }
    const allWords = await getAllWords(id);
    const wmap = new Map(allWords.map((w) => [w.wordId, w]));
    set({
      session: {
        queue: states.map((s) => ({ state: s, word: wmap.get(s.wordId)! })).filter((x) => x.word),
        idx: 0, correct: 0, wrong: 0, newCount: 0, reviewCount: 0,
        isReview: true, answered: false, currentChoices: [], correctIndex: -1,
      },
      reviewMode: "image-to-meaning", view: "review",
    });
    await buildCurrentChoices();
  },

  answerChoice: async (index) => {
    const sess = get().session;
    if (!sess || sess.answered) return;
    sess.answered = true;
    const correct = index === sess.correctIndex;
    const item = sess.queue[sess.idx];
    await recordAndUpdate(get, set, correct, item);
    // 自动下一题（3 秒）
    scheduleAutoNext(set, get, 1500);
  },

  answerSpelling: async (input) => {
    const sess = get().session;
    if (!sess || sess.answered) return;
    const item = sess.queue[sess.idx];
    const target = (get().currentLib?.lang === "ja" ? item.word.kana : item.word.word) || item.word.word;
    const correct = input.trim().toLowerCase() === target.trim().toLowerCase();
    sess.answered = true;
    await recordAndUpdate(get, set, correct, item);
    scheduleAutoNext(set, get, 2500);
  },

  answerTrueFalse: async (choice) => {
    const sess = get().session;
    if (!sess || sess.answered) return;
    // correctIndex 存放 1=对/0=错 的真值；实际答案是否匹配
    const truth = sess.correctIndex === 1;
    const correct = choice === truth;
    sess.answered = true;
    const item = sess.queue[sess.idx];
    await recordAndUpdate(get, set, correct, item);
    scheduleAutoNext(set, get, 1500);
  },

  nextCard: async () => {
    const sess = get().session;
    if (!sess) return;
    if (sess.autoNextTimer) { clearTimeout(sess.autoNextTimer); }
    sess.idx++;
    if (sess.idx >= sess.queue.length) {
      set({ session: null, view: "home" });
      get().showToast(`本次完成：对 ${sess.correct} · 错 ${sess.wrong}`);
      await get().refreshStats();
      return;
    }
    sess.answered = false; sess.currentChoices = []; sess.correctIndex = -1;
    set({ session: { ...sess } });
    await buildCurrentChoices();
    await get().saveResume(sess.queue[sess.idx].word.wordId, sess.isReview ? "review" : "learn");
  },

  learnNext: async () => {
    const sess = get().session;
    const id = get().currentLibId;
    if (!sess || !id) return;
    const item = sess.queue[sess.idx];
    // 新词：标记为已学（new→learning，10 分钟后再巩固）
    if (item.state.status === "new") {
      const updated = applyAnswer(item.state, true, "image-to-meaning");
      // presentation 视为"见过"，proficiency 设为 1，进入 learning
      updated.status = "learning";
      updated.proficiency = Math.max(1, updated.proficiency);
      updated.interval = 10 * 60 * 1000;
      updated.due = Date.now() + updated.interval;
      await putState(updated);
      await updateLogAndStreak(id, "new", true);
      sess.newCount++;
    }
    sess.idx++;
    if (sess.idx >= sess.queue.length) {
      // 学完新词，自动进入复习模式
      set({ session: null });
      get().showToast("新词学完，进入复习模式 🔁");
      await get().refreshStats();
      await get().startReview();
      return;
    }
    set({ session: { ...sess } });
    await get().saveResume(sess.queue[sess.idx].word.wordId, "learn");
  },

  saveResume: async (wordId, mode) => {
    const id = get().currentLibId;
    if (!id) return;
    const s = await ensureSettings(id);
    s.resumeWordId = wordId; s.resumeMode = mode; s.resumeTs = Date.now();
    await putSettings(s);
    set({ settings: s });
  },

  clearSession: () => set({ session: null }),

  toggleHardBook: async (wordId, add) => {
    const id = get().currentLibId;
    if (!id) return;
    const s = await getState(id, wordId);
    if (!s) return;
    s.inHardBook = add;
    await putState(s);
    await get().refreshStats();
  },

  exportBook: async (which) => {
    const id = get().currentLibId;
    if (!id) return "";
    const states = which === "hard" ? await getHardBook(id) : await getWrongBook(id);
    const allWords = await getAllWords(id);
    const wmap = new Map(allWords.map((w) => [w.wordId, w]));
    const rows: string[][] = [["word", "kana", "phonetic", "pos", "meaning", "wrongCount"]];
    for (const s of states) {
      const w = wmap.get(s.wordId);
      if (!w) continue;
      rows.push([w.word, w.kana || "", w.phonetic || "", w.pos || "", w.meaning, String(s.wrongCount)]);
    }
    return rows.map((r) => r.map((c) => /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(",")).join("\n");
  },
}));

// ====== 辅助：构建当前卡片选项 ======
async function buildCurrentChoices() {
  const { session, currentLibId, reviewMode } = useAppStore.getState();
  if (!session || !currentLibId) return;
  const item = session.queue[session.idx];
  if (!item) return;
  const allWords = await getAllWords(currentLibId);
  let choices: string[] = [];
  let correctIndex = -1;

  const mode = session.isReview ? reviewMode : "image-to-meaning";

  if (mode === "image-to-meaning" || mode === "listen-to-meaning") {
    // 看图/听音 → 选释义
    const correct = item.word.meaning;
    const pool = allWords.filter((w) => w.wordId !== item.word.wordId).map((w) => w.meaning);
    const unique = [...new Set(pool)];
    const distractors = shuffle(unique).slice(0, 3);
    while (distractors.length < 3) distractors.push("（无干扰项）");
    choices = shuffle([correct, ...distractors]);
    correctIndex = choices.indexOf(correct);
  } else if (mode === "meaning-to-word") {
    // 看义 → 选词
    const correct = item.word.word;
    const pool = allWords.filter((w) => w.wordId !== item.word.wordId).map((w) => w.word);
    const unique = [...new Set(pool)];
    const distractors = shuffle(unique).slice(0, 3);
    while (distractors.length < 3) distractors.push("—");
    choices = shuffle([correct, ...distractors]);
    correctIndex = choices.indexOf(correct);
  } else if (mode === "true-false") {
    // 判断对错：随机构造一个释义，可能正确或错误
    const useCorrect = Math.random() < 0.5;
    if (useCorrect) {
      choices = [item.word.meaning]; // 显示正确释义 → 应判「对」
      correctIndex = 1;
    } else {
      // 取一个错误释义
      const pool = allWords.filter((w) => w.wordId !== item.word.wordId).map((w) => w.meaning);
      const wrong = shuffle([...new Set(pool)])[0] || "（无）";
      choices = [wrong];
      correctIndex = 0; // 真值为「错」
    }
  } else {
    // spelling：无选项
    choices = [];
    correctIndex = -1;
  }
  useAppStore.setState((st) => ({
    session: { ...st.session!, currentChoices: choices, correctIndex },
  }));
}

// 记录答案 + 更新 SRS + 日志 + 打卡
async function recordAndUpdate(get: () => AppState, set: (fn: any) => void, correct: boolean, item: SessionItem) {
  const id = get().currentLibId;
  if (!id) return;
  const sess = get().session!;
  if (correct) sess.correct++; else sess.wrong++;
  if (item.state.status === "new") sess.newCount++;
  else sess.reviewCount++;
  const mode = sess.isReview ? get().reviewMode : "image-to-meaning";
  const updated = applyAnswer(item.state, correct, mode);
  await putState(updated);
  // 把更新后的 state 写回会话队列，供 UI 显示「答对/答错」反馈
  sess.queue[sess.idx] = { ...item, state: updated };
  // 日志 + 打卡
  await updateLogAndStreak(id, item.state.status, correct);
  set({ session: { ...sess } });
}

async function updateLogAndStreak(libId: string, prevStatus: WordState["status"], correct: boolean) {
  const t = today();
  let log = await getLog(libId, t);
  if (!log) log = { key: `${libId}:${t}`, libId, date: t, newCount: 0, reviewCount: 0, correct: 0, wrong: 0 };
  if (prevStatus === "new" || prevStatus === "learning") log.newCount++; else log.reviewCount++;
  if (correct) log.correct++; else log.wrong++;
  await putLog(log);
  // 打卡
  const s = await ensureSettings(libId);
  if (s.todayDate !== t) {
    if (s.lastStudyDate) {
      const last = new Date(s.lastStudyDate);
      const now = new Date(t);
      const diff = Math.round((now.getTime() - last.getTime()) / 86400000);
      s.streak = diff === 1 ? (s.streak || 0) + 1 : 1;
    } else s.streak = 1;
    s.todayDate = t; s.todayStudied = 0; s.lastStudyDate = t;
  } else if (!s.lastStudyDate) { s.lastStudyDate = t; s.streak = s.streak || 1; }
  if (prevStatus === "new" || prevStatus === "learning") s.todayStudied = (s.todayStudied || 0) + 1;
  await putSettings(s);
  useAppStore.setState({ settings: s });
}

function scheduleAutoNext(set: (fn: any) => void, get: () => AppState, ms: number) {
  setTimeout(() => {
    const sess = get().session;
    if (sess && sess.answered) {
      useAppStore.getState().nextCard();
    }
  }, ms);
}

// 每日重置
async function checkDailyReset() {
  const libs = await listLibraries();
  const t = today();
  for (const lib of libs) {
    const s = await ensureSettings(lib.id);
    if (s.todayDate && s.todayDate !== t) {
      s.todayDate = t; s.todayStudied = 0;
      await putSettings(s);
    }
  }
}

export { REVIEW_MODES };
