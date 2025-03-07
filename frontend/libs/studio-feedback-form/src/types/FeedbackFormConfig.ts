import type { ButtonTexts, QuestionConfig } from './QuestionsProps';
import type { AnswerType } from './AnswerType';

export type FeedbackFormConfig = {
  id: string;
  buttonTexts: ButtonTexts;
  heading: string;
  description: string;
  disclaimer?: string;
  questions: QuestionConfig[];
  position?: 'inline' | 'fixed';
  submitPath: string;
  onSubmit?: (answers: Record<string, AnswerType>, path: string) => void;
};
