import React from 'react';
import { StudioButton, StudioModal } from '@studio/components';
import type { QuestionConfig } from '../types/QuestionsProps';
import { YesNoQuestion } from './Question/YesNoQuestion';
import { useFeedbackFormContext } from '../contexts/FeedbackFormContext';
import { TextQuestion } from './Question/TextQuestion';
import classes from './FeedbackForm.module.css';

type FeedbackFormProps = {
  triggerButtonText: string;
  closeButtonText: string;
  heading: string;
  questions: QuestionConfig[];
  position?: 'inline' | 'fixed';
  onSubmit: (answers: Record<string, any>) => void;
};

export function FeedbackForm({
  questions,
  triggerButtonText,
  closeButtonText,
  heading,
  position = 'inline',
  onSubmit,
}: FeedbackFormProps): React.ReactElement {
  const { answers, setAnswers } = useFeedbackFormContext();

  const handleAnswerChange = (questionId: string, answer: any) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
  };
  return (
    <StudioModal.Root>
      <StudioModal.Trigger className={position === 'fixed' ? classes.fixed : undefined}>
        {triggerButtonText}
      </StudioModal.Trigger>
      <StudioModal.Dialog heading={heading} closeButtonTitle={closeButtonText}>
        {questions.map((question) => {
          switch (question.type) {
            case 'yesNo':
              return (
                <YesNoQuestion
                  id={question.id}
                  key={question.id}
                  label={question.questionText}
                  onChange={handleAnswerChange}
                />
              );
            case 'text':
              return (
                <TextQuestion
                  id={question.id}
                  key={question.id}
                  label={question.questionText}
                  onChange={handleAnswerChange}
                />
              );
            default:
              return null;
          }
        })}
        <StudioButton onClick={() => onSubmit(answers)} color='success'>
          Send inn
        </StudioButton>
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
}
