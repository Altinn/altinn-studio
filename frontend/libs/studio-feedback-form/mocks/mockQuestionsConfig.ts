import type { QuestionConfig } from '../src/types/QuestionsProps';

export const mockQuestions: QuestionConfig[] = [
  {
    questionText: 'What is your name?',
    type: 'text',
    id: 'name',
  },
  {
    questionText: 'What is your email?',
    type: 'text',
    id: 'email',
  },
  {
    questionText: 'Was this better?',
    type: 'yesNo',
    id: 'better',
  },
];
