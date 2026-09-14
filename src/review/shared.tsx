// review/shared.tsx — 复习模式共享：当前卡片信息 + 反馈 + 选项高亮
import { useAppStore } from "../store/useAppStore";
import type { SessionItem } from "../types";

export function useCurrentItem(): { item: SessionItem; choices: string[]; answered: boolean; correctIndex: number } | null {
  const session = useAppStore((s) => s.session);
  if (!session || session.idx >= session.queue.length) return null;
  const item = session.queue[session.idx];
  if (!item) return null;
  return { item, choices: session.currentChoices, answered: session.answered, correctIndex: session.correctIndex };
}

export function Feedback({ answered, correct }: { answered: boolean; correct: boolean }) {
  if (!answered) return null;
  return (
    <div className={`feedback show ${correct ? "correct" : "wrong"}`}>
      {correct ? "✓ 答对了！" : "✗ 再加油，已加入错题本"}
    </div>
  );
}

// 选项点击高亮（答对绿色，答错红色）
export function choiceClass(index: number, answered: boolean, correctIndex: number): string {
  if (!answered) return "";
  if (index === correctIndex) return "correct";
  return "wrong";
}
