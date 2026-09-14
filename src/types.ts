// types.ts — 全局类型定义

// 语言
export type Lang = "en" | "ja" | "other";

// 词条原始数据（词库内的一个词）
export interface WordEntry {
  libId: string;
  wordId: number;          // 词库内序号
  word: string;           // 单词 / 汉字假名表记
  phonetic?: string;      // 音标（英语）
  kana?: string;          // 假名读音（日语）
  romaji?: string;        // 罗马音（日语）
  pos?: string;           // 词性
  meaning: string;        // 中文释义
  emoji?: string;         // emoji 配图
  imageUrl?: string;      // 图片 URL（可选）
  example?: string;        // 例句
  exampleTrans?: string;  // 例句翻译
}

// 词库元信息
export interface LibraryMeta {
  id: string;
  name: string;
  lang: Lang;
  level: string;
  type: "custom";
  total: number;
  createdAt: number;
}

// 单词状态（0-5 熟练度 + 调度信息）
export type WordStatus = "new" | "learning" | "review" | "mastered";

export interface ReviewLogEntry {
  t: number;              // 时间戳
  correct: boolean;       // 对错
  mode?: ReviewMode;      // 复习模式
}

export interface WordState {
  key: string;             // `${libId}:${wordId}`
  libId: string;
  wordId: number;
  status: WordStatus;
  proficiency: number;     // 0-5 熟练度
  interval: number;        // 当前间隔（毫秒）
  due: number;             // 下次复习时间戳；0=立即可学
  reps: number;            // 连续答对
  lapses: number;          // 遗忘次数
  lastReviewed: number;    // 上次复习时间
  history: ReviewLogEntry[]; // 复习历史
  wrongCount: number;      // 进错题本次数
  inWrongBook: boolean;     // 是否在错题本
  wrongAt: number;          // 最近进错题本时间
  inHardBook: boolean;      // 是否在生词本（手动）
}

// 每词库配置 + 打卡
export interface LibSettings {
  libId: string;
  dailyGoal: number;        // 每日新词数
  lastStudyDate: string | null; // YYYY-MM-DD
  streak: number;           // 连续打卡
  todayStudied: number;     // 今日已学新词
  todayDate: string | null; // 标记 todayStudied 所属日
  // 断点续学：上次学到哪
  resumeWordId: number | null; // 上次学到的 wordId
  resumeMode: "learn" | "review" | null;
  resumeTs: number | null;
}

// 每日日志
export interface DailyLog {
  key: string;              // `${libId}:${YYYY-MM-DD}`
  libId: string;
  date: string;
  newCount: number;
  reviewCount: number;
  correct: number;
  wrong: number;
}

// 复习模式
export type ReviewMode =
  | "image-to-meaning"   // 看图选义
  | "meaning-to-word"    // 看义选词
  | "spelling"           // 拼写
  | "listen-to-meaning"  // 听音选义
  | "true-false";        // 判断对错

// 统计概览（某词库）
export interface LibStats {
  total: number;
  mastered: number;
  learning: number;
  review: number;
  fresh: number;
  due: number;
  wrong: number;
  hard: number;
  streak: number;
  acc: number;
  days: { date: string; count: number; newCount: number; reviewCount: number }[];
  totalDays: number;
}

// 视图
export type View = "home" | "learn" | "review" | "library" | "wordbook" | "stats" | "settings";

// 学习会话
export interface SessionItem {
  state: WordState;
  word: WordEntry;
}
export interface LearnSession {
  queue: SessionItem[];
  idx: number;
  correct: number;
  wrong: number;
  newCount: number;
  reviewCount: number;
  isReview: boolean;
  answered: boolean;
  currentChoices: string[];
  correctIndex: number;
  autoNextTimer?: number;
}
