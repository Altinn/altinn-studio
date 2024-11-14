export type QuestionsProps = {
  id: string;
  label: string;
  onChange: (questionId: string, value: any) => void;
};

export type QuestionConfig = TextQuestionProps | YesNoQuestionProps | CheckboxQuestionProps;

export type QuestionConfigBase = {
  id: string;
  questionText: string;
};

export type TextQuestionProps = QuestionConfigBase & { type: 'text' };

export type YesNoQuestionProps = QuestionConfigBase & { type: 'yesNo' };

export type CheckboxQuestionProps = QuestionConfigBase & {
  type: 'checkbox';
  options: AnswerOption[];
};

export type AnswerOption = {
  label: string;
  value: string;
};
