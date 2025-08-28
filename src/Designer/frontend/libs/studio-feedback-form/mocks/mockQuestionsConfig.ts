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
    buttonLabels: {
      yes: 'Yes',
      no: 'No',
    },
  },
  {
    questionText: 'Choose your favorite colors',
    type: 'checkbox',
    id: 'colors',
    options: [
      { label: 'Red', value: 'red' },
      { label: 'Green', value: 'green' },
      { label: 'Blue', value: 'blue' },
    ],
  },
];
