// utils/parse.ts — CSV / JSON 解析（含 UTF-8 BOM 兼容）、语言自动检测、去重
import type { Lang, WordEntry } from "../types";

// 去除 BOM
function stripBOM(s: string) { return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s; }

// CSV 行切分（支持引号、转义）
function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuote = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// 字段别名映射
const ALIASES: Record<string, string[]> = {
  wordId: ["wordid", "id", "序号"],
  word: ["word", "w", "单词", "词", "term", "kanji", "漢字", "表记"],
  phonetic: ["phonetic", "ph", "音标", "ipa", "phonetic"],
  kana: ["kana", "假名", "かな", "reading", "读音"],
  romaji: ["romaji", "罗马音", "romaji"],
  pos: ["pos", "词性", "part"],
  meaning: ["meaning", "m", "释义", "中文", "翻译", "definition", "trans", "definition_zh"],
  emoji: ["emoji", "e", "图标", "icon", "image"],
  imageUrl: ["image_url", "imageurl", "image", "img", "图片", "配图"],
  example: ["example", "ex", "例句", "sentence"],
  exampleTrans: ["example_trans", "exampletrans", "extrans", "例句翻译", "sentencetrans", "exzh"],
};

function normalizeWord(raw: Record<string, string>, i: number, libId: string): WordEntry {
  const get = (field: keyof typeof ALIASES) => {
    for (const k of ALIASES[field]) {
      for (const rk of Object.keys(raw)) {
        if (rk.toLowerCase() === k) return String(raw[rk] ?? "").trim();
      }
    }
    return "";
  };
  const word = get("word");
  const meaning = get("meaning");
  if (!word || !meaning) throw new Error(`第 ${i + 1} 条缺少 word 或 meaning 字段`);
  const widRaw = get("wordId");
  return {
    libId, wordId: widRaw ? Number(widRaw) : i + 1,
    word, phonetic: get("phonetic") || undefined,
    kana: get("kana") || undefined, romaji: get("romaji") || undefined,
    pos: get("pos") || undefined, meaning,
    emoji: get("emoji") || undefined, imageUrl: get("imageUrl") || undefined,
    example: get("example") || undefined, exampleTrans: get("exampleTrans") || undefined,
  };
}

export function parseCSV(text: string, libId: string): WordEntry[] {
  const clean = stripBOM(text.replace(/^\uFEFF/, ""));
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV 至少需要表头 + 1 行数据");
  const headers = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((line) => splitCSVLine(line));
  return rows.map((cells, i) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => (obj[h] = cells[idx] != null ? cells[idx].trim() : ""));
    return normalizeWord(obj, i, libId);
  });
}

export function parseJSON(text: string, libId: string): WordEntry[] {
  const data = JSON.parse(stripBOM(text.replace(/^\uFEFF/, "")));
  const arr = Array.isArray(data) ? data : [data];
  return arr.map((raw, i) => normalizeWord(raw as Record<string, string>, i, libId));
}

export function autoDetectLang(words: WordEntry[]): Lang {
  // 有 kana → 日语；有 phonetic → 英语；否则 other
  if (words.some((w) => w.kana)) return "ja";
  if (words.some((w) => w.phonetic)) return "en";
  return "other";
}

// 去重（按 word 小写），保留首次出现
export function dedupe(words: WordEntry[]): WordEntry[] {
  const seen = new Set<string>();
  const out: WordEntry[] = [];
  let id = 1;
  for (const w of words) {
    const k = w.word.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push({ ...w, wordId: id++ });
  }
  return out;
}

// 自动识别格式并解析
export function parseAny(text: string, libId: string): WordEntry[] {
  const trimmed = stripBOM(text.replace(/^\uFEFF/, "")).trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return parseJSON(trimmed.startsWith("{") ? `[${trimmed}]` : trimmed, libId);
  }
  return parseCSV(text, libId);
}

// 模板（导入浮层参考）
export const TEMPLATE_CSV_EN = `word,phonetic,pos,meaning,emoji,example,example_trans,image_url
apple,/ˈæp.əl/,n.,苹果,🍎,I eat an apple.,我吃一个苹果。,
book,/bʊk/,n.,书,📚,This is a book.,这是一本书。,`;

export const TEMPLATE_CSV_JA = `word,kana,romaji,pos,meaning,emoji,example,example_trans,image_url
林檎,りんご,ringo,名,苹果,🍎,林檎を食べる。,吃苹果。,
本,ほん,hon,名,书,📚,本を読む。,读书。,`;

export const TEMPLATE_JSON_EN = JSON.stringify([
  { word: "apple", phonetic: "/ˈæp.əl/", pos: "n.", meaning: "苹果", emoji: "🍎", example: "I eat an apple.", example_trans: "我吃一个苹果。" },
], null, 2);

export const TEMPLATE_JSON_JA = JSON.stringify([
  { word: "林檎", kana: "りんご", romaji: "ringo", pos: "名", meaning: "苹果", emoji: "🍎", example: "林檎を食べる。", example_trans: "吃苹果。" },
], null, 2);
