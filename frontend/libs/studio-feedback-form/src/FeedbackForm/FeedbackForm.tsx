import React from 'react';
import { StudioButton, StudioModal } from '@studio/components';
import type { ButtonTexts, QuestionConfig, QuestionsProps } from '../types/QuestionsProps';
import { YesNoQuestion } from './Question/YesNoQuestion';
import { useFeedbackFormContext } from '../contexts/FeedbackFormContext';
import { TextQuestion } from './Question/TextQuestion';
import classes from './FeedbackForm.module.css';
import { getDefaultAnswerValueForQuestion } from '../utils/questionUtils';

type FeedbackFormProps = {
  buttonTexts: ButtonTexts;
  heading: string;
  questions: QuestionConfig[];
  position?: 'inline' | 'fixed';
  onSubmit: (answers: Record<string, any>) => void;
};

export function FeedbackForm({
  questions,
  buttonTexts,
  heading,
  position = 'inline',
  onSubmit,
}: FeedbackFormProps): React.ReactElement {
  const { answers, setAnswers } = useFeedbackFormContext();

  const handleAnswerChange = (questionId: string, answer: any) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
  };

  const renderQuestion = (question: QuestionConfig) => {
    const questionBaseProps: QuestionsProps = {
      id: question.id,
      key: question.id,
      label: question.questionText,
      onChange: handleAnswerChange,
      value: answers[question.id] || getDefaultAnswerValueForQuestion(question),
    };
    switch (question.type) {
      case 'yesNo':
        return <YesNoQuestion buttonLabels={question.buttonLabels} {...questionBaseProps} />;
      case 'text':
        return <TextQuestion {...questionBaseProps} />;
      default:
        return null;
    }
  };
  return (
    <StudioModal.Root>
      <StudioModal.Trigger className={position === 'fixed' ? classes.fixed : undefined}>
        {buttonTexts.trigger}
      </StudioModal.Trigger>
      <StudioModal.Dialog heading={heading} closeButtonTitle={buttonTexts.close}>
        {questions.map((question) => {
          return renderQuestion(question);
        })}
        <StudioButton onClick={() => onSubmit(answers)} color='success'>
          {buttonTexts.submit}
        </StudioButton>
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
}
