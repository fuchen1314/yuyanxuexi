// review/MeaningToWord.tsx — 看义选词：展示中文释义，四选一选对应单词
import { useAppStore } from "../store/useAppStore";
import { useCurrentItem, Feedback, choiceClass } from "./shared";

export function MeaningToWord() {
  const cur = useCurrentItem();
  const answerChoice = useAppStore((s) => s.answerChoice);
  const nextCard = useAppStore((s) => s.nextCard);
  if (!cur) return null;
  const { item, choices, answered, correctIndex } = cur;
  const last = item.state.history[item.state.history.length - 1];
  const correct = answered && last?.correct;

  return (
    <>
      <div className="word-card">
        <div className="meaning" style={{ margin: "20px 0" }}>{item.word.meaning}</div>
        {item.word.pos && <span className="pos">{item.word.pos}</span>}
      </div>
      <div className="choices">
        {choices.map((c, i) => (
          <div
            key={i}
            className={`choice ${choiceClass(i, answered, correctIndex)} ${answered ? "disabled" : ""}`}
            onClick={() => !answered && answerChoice(i)}
          >{c}</div>
        ))}
      </div>
      {answered && (
        <div className="word-card" style={{ marginTop: 10, padding: 16 }}>
          <div className="word">{item.word.word}</div>
          {item.word.kana && <div className="kana">{item.word.kana}</div>}
          {item.word.phonetic && <div className="phonetic">{item.word.phonetic}</div>}
        </div>
      )}
      <Feedback answered={answered} correct={correct} />
      {answered && <button className="btn primary" onClick={() => nextCard()}>下一题 →</button>}
    </>
  );
}
