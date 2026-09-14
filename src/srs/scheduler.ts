// srs/scheduler.ts — 简化 SM-2 / 艾宾浩斯 调度（按需求固定间隔阶梯）
// 答对：熟练度+1，间隔按 10分钟→1天→2天→4天→7天→15天→30天 递增
// 答错：熟练度归0，10 分钟后重新出现并标记生词

import type { WordState, ReviewMode } from "../types";

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

// 间隔阶梯（按熟练度级别递增），单位毫秒
const LADDER = [
  0,            // proficiency 0: 未学 / 刚答错
  10 * MIN,     // 1: 10 分钟
  1 * DAY,      // 2: 1 天
  2 * DAY,      // 3: 2 天
  4 * DAY,      // 4: 4 天
  7 * DAY,      // 5: 7 天
  15 * DAY,     // 6: 15 天
  30 * DAY,     // 7+: 30 天（封顶）
];

export function intervalForProficiency(p: number): number {
  if (p <= 0) return 10 * MIN;
  return LADDER[Math.min(p, LADDER.length - 1)];
}

export function applyAnswer(state: WordState, correct: boolean, mode?: ReviewMode): WordState {
  const now = Date.now();
  const s: WordState = {
    ...state,
    history: [...state.history, { t: now, correct, mode }],
  };

  if (correct) {
    // 熟练度+1（封顶 5）
    s.proficiency = Math.min(5, (state.proficiency || 0) + 1);
    s.reps = (state.reps || 0) + 1;
    s.lastReviewed = now;

    if (state.status === "new") {
      s.status = "learning";
      s.proficiency = Math.max(s.proficiency, 1);
      s.interval = intervalForProficiency(s.proficiency);
      s.due = now + s.interval;
    } else if (state.status === "learning") {
      // 学习中：连续答对进入 review
      s.interval = intervalForProficiency(s.proficiency);
      s.due = now + s.interval;
      if (s.reps >= 2) s.status = "review";
    } else if (state.status === "review") {
      s.interval = intervalForProficiency(s.proficiency);
      s.due = now + s.interval;
      if (s.proficiency >= 5 && s.interval >= 15 * DAY) s.status = "mastered";
    } else if (state.status === "mastered") {
      s.interval = Math.max(30 * DAY, state.interval || 30 * DAY);
      s.due = now + s.interval;
    }
    // 答对：错题本中连对 2 次后移除
    if (state.inWrongBook && s.reps >= 2) s.inWrongBook = false;
  } else {
    // 答错：熟练度归 0，10 分钟后重新出现并标记生词
    s.proficiency = 0;
    s.reps = 0;
    s.lapses = (state.lapses || 0) + 1;
    s.wrongCount = (state.wrongCount || 0) + 1;
    s.inWrongBook = true;
    s.wrongAt = now;
    s.lastReviewed = now;
    s.interval = 10 * MIN;
    s.due = now + 10 * MIN;
    if (state.status === "mastered" || state.status === "review") {
      s.status = "review";
    } else {
      s.status = "learning";
    }
  }
  return s;
}

// 构建学习/复习队列
import { getAllStates } from "../db";
export async function buildQueues(libId: string) {
  const states = await getAllStates(libId);
  const now = Date.now();
  const newQueue = states.filter((s) => s.status === "new").sort((a, b) => a.wordId - b.wordId);
  const reviewQueue = states
    .filter((s) => s.status === "review" && s.due <= now)
    .sort((a, b) => a.due - b.due);
  const learningQueue = states
    .filter((s) => s.status === "learning" && s.due <= now)
    .sort((a, b) => a.due - b.due);
  return { newQueue, reviewQueue, learningQueue };
}

// 统计某词库
import { listLogs, ensureSettings } from "../db";
import type { LibStats } from "../types";
export async function getStats(libId: string): Promise<LibStats> {
  const states = await getAllStates(libId);
  const total = states.length;
  const mastered = states.filter((s) => s.status === "mastered").length;
  const learning = states.filter((s) => s.status === "learning").length;
  const review = states.filter((s) => s.status === "review").length;
  const fresh = states.filter((s) => s.status === "new").length;
  const due = states.filter((s) => s.status === "review" && s.due <= Date.now()).length;
  const wrong = states.filter((s) => s.inWrongBook).length;
  const hard = states.filter((s) => s.inHardBook).length;
  const logs = await listLogs(libId);
  const totalCorrect = logs.reduce((a, l) => a + (l.correct || 0), 0);
  const totalWrong = logs.reduce((a, l) => a + (l.wrong || 0), 0);
  const acc = totalCorrect + totalWrong > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : 0;
  const days: LibStats["days"] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const log = logs.find((l) => l.date === ds);
    days.push({ date: ds, count: log ? log.newCount + log.reviewCount : 0, newCount: log?.newCount || 0, reviewCount: log?.reviewCount || 0 });
  }
  const s = await ensureSettings(libId);
  return { total, mastered, learning, review, fresh, due, wrong, hard, streak: s.streak || 0, acc, days, totalDays: logs.length };
}
