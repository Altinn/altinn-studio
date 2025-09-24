import type { QuestionConfig } from '../types/QuestionsProps';

type QuestionType = Extract<QuestionConfig, { type: string }>['type'];

const defaultValueMap: Record<QuestionType, string | Array<string>> = {
  text: '',
  yesNo: '',
  checkbox: [],
};

/**
 * Gets the default answer value for a given question
 * @param question The question to get the default answer value for
 * @returns The value to use as the default answer for the question
 */
export function getDefaultAnswerValueForQuestion(question: QuestionConfig) {
  return defaultValueMap[question.type];
}
