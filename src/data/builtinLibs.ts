// data/builtinLibs.ts — 内置词库清单（10 个分级词库）
// 对应文件位于 public/wordlibs/*.csv，Vite 会原样打包，运行时用 fetch 读取
import type { Lang } from "../types";

export interface BuiltinLibDef {
  id: string;              // 固定 ID（不会变），用于跟踪进度
  name: string;           // 显示名
  lang: Lang;
  level: string;          // 级别标签
  file: string;           // 相对 public 的 CSV 路径
}

// 内置词库版本号：升级词库内容时 +1，应用启动会重新载入
export const BUILTIN_LIBS_VERSION = 1;

export const BUILTIN_LIBS: BuiltinLibDef[] = [
  // 英语 5 个
  { id: "en_gaokao",   name: "高考 3500",         lang: "en", level: "高考",   file: "wordlibs/English_GaoKao_3500.csv" },
  { id: "en_cet4",     name: "四级 CET4",          lang: "en", level: "CET4",   file: "wordlibs/English_CET4.csv" },
  { id: "en_cet6",     name: "六级 CET6",          lang: "en", level: "CET6",   file: "wordlibs/English_CET6.csv" },
  { id: "en_kaoyan",   name: "考研（2025 红宝书）", lang: "en", level: "考研",   file: "wordlibs/English_KaoYan.csv" },
  { id: "en_ielts",    name: "雅思（鸭圈核心词）",  lang: "en", level: "雅思",   file: "wordlibs/English_IELTS.csv" },
  // 日语 5 个
  { id: "ja_n5",       name: "JLPT N5",            lang: "ja", level: "N5",     file: "wordlibs/Japanese_JLPT_N5.csv" },
  { id: "ja_n4",       name: "JLPT N4",            lang: "ja", level: "N4",     file: "wordlibs/Japanese_JLPT_N4.csv" },
  { id: "ja_n3",       name: "JLPT N3",            lang: "ja", level: "N3",     file: "wordlibs/Japanese_JLPT_N3.csv" },
  { id: "ja_n2",       name: "JLPT N2",            lang: "ja", level: "N2",     file: "wordlibs/Japanese_JLPT_N2.csv" },
  { id: "ja_n1",       name: "JLPT N1",            lang: "ja", level: "N1",     file: "wordlibs/Japanese_JLPT_N1.csv" },
];
