import type { ButtonTexts, QuestionConfig } from './QuestionsProps';
export type FeedbackFormConfig = {
  id: string;
  buttonTexts: ButtonTexts;
  heading: string;
  description: string;
  disclaimer?: string;
  questions: QuestionConfig[];
  position?: 'inline' | 'fixed';
  submitPath: string;
};
