// components/WordCard.tsx — 单词展示卡片（学习/复习通用）
import type { WordEntry, Lang } from "../types";
import { speak } from "../utils/misc";

export function WordCardView({
  word, lang, onSpeak, reveal = true, hard = false, onToggleHard, showMeaning = true,
}: {
  word: WordEntry;
  lang: Lang;
  onSpeak?: () => void;
  reveal?: boolean;
  hard?: boolean;
  onToggleHard?: () => void;
  showMeaning?: boolean;
}) {
  const speakIt = () => {
    if (onSpeak) return onSpeak();
    speak(lang === "ja" ? word.kana || word.word : word.word, lang);
  };
  return (
    <div className="word-card">
      {onToggleHard && (
        <button className={`hard-toggle ${hard ? "on" : ""}`} onClick={onToggleHard} title="加入生词本">
          {hard ? "★" : "☆"}
        </button>
      )}
      {word.pos && <span className="pos">{word.pos}</span>}
      {word.imageUrl ? (
        <img className="img-cover" src={word.imageUrl} alt={word.word} onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
      ) : word.emoji ? (
        <div className="emoji">{word.emoji}</div>
      ) : null}
      <div className="word">{word.word}</div>
      {word.kana && <div className="kana">{word.kana}</div>}
      {word.romaji && <div className="romaji">{word.romaji}</div>}
      {word.phonetic && <div className="phonetic">{word.phonetic}</div>}
      <button className="speak-btn" onClick={speakIt} title="发音">🔊</button>
      {showMeaning && reveal && <div className="meaning">{word.meaning}</div>}
      {word.example && (
        <div className="example">
          {word.example}
          {word.exampleTrans && <span className="ex-trans">{word.exampleTrans}</span>}
        </div>
      )}
    </div>
  );
}
