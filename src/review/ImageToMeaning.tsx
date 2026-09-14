// review/ImageToMeaning.tsx — 看图选义：展示单词+配图，四选一选释义
import { useAppStore } from "../store/useAppStore";
import { useCurrentItem, Feedback, choiceClass } from "./shared";
import { speak } from "../utils/misc";
import { WordCardView } from "../components/WordCard";

export function ImageToMeaning() {
  const cur = useCurrentItem();
  const lib = useAppStore((s) => s.currentLib);
  const answerChoice = useAppStore((s) => s.answerChoice);
  const nextCard = useAppStore((s) => s.nextCard);
  if (!cur) return null;
  const { item, choices, answered, correctIndex } = cur;
  const lang = lib?.lang || "en";
  const correct = answered && item.state.history.length && item.state.history[item.state.history.length - 1]?.correct;

  return (
    <>
      <WordCardView
        word={{ ...item.word, meaning: answered ? item.word.meaning : "" }}
        lang={lang}
        showMeaning={answered}
        onSpeak={() => speak(lang === "ja" ? item.word.kana || item.word.word : item.word.word, lang)}
      />
      <div className="choices">
        {choices.map((c, i) => (
          <div
            key={i}
            className={`choice ${choiceClass(i, answered, correctIndex)} ${answered ? "disabled" : ""}`}
            onClick={() => !answered && answerChoice(i)}
          >{c}</div>
        ))}
      </div>
      <Feedback answered={answered} correct={correct} />
      {answered && <button className="btn primary" onClick={() => nextCard()}>下一题 →</button>}
    </>
  );
}
