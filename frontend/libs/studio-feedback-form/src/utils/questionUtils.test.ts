import type { QuestionConfig } from '../types/QuestionsProps';
import { getDefaultAnswerValueForQuestion } from './questionUtils';

describe('getDefaultAnswerValueForQuestion', () => {
  it('should return empty string for text question', () => {
    const question: QuestionConfig = {
      type: 'text',
      id: '1',
      questionText: 'Question',
    };
    expect(getDefaultAnswerValueForQuestion(question)).toEqual('');
  });

  it('should return empty string for yesNo question', () => {
    const question: QuestionConfig = {
      type: 'yesNo',
      id: '1',
      questionText: 'Question',
      buttonLabels: {
        yes: 'Yes',
        no: 'No',
      },
    };
    expect(getDefaultAnswerValueForQuestion(question)).toEqual('');
  });

  it('should return empty array for checkbox question', () => {
    const question: QuestionConfig = {
      type: 'checkbox',
      id: '1',
      questionText: 'Question',
      options: [],
    };
    expect(getDefaultAnswerValueForQuestion(question)).toEqual([]);
  });
});
