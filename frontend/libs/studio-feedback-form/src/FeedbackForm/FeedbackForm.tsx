import React, { useCallback, useRef } from 'react';
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

  const modalRef = useRef<HTMLDialogElement>(null);

  const handleCloseModal = () => {
    setAnswers({});
    modalRef.current?.close();
  };

  const handleOpenModal = useCallback(() => {
    modalRef.current?.showModal();
  }, []);

  const handleAnswerChange = (questionId: string, answer: any) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    onSubmit(answers);
    handleCloseModal();
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
      <StudioButton
        className={position === 'fixed' ? classes.fixed : undefined}
        onClick={handleOpenModal}
      >
        {buttonTexts.trigger}
      </StudioButton>
      <StudioModal.Dialog
        onClose={handleCloseModal}
        heading={heading}
        closeButtonTitle={buttonTexts.close}
        ref={modalRef}
      >
        {questions.map((question) => {
          return renderQuestion(question);
        })}
        <StudioButton onClick={handleSubmit} color='success'>
          {buttonTexts.submit}
        </StudioButton>
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
}
