import React, { useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { StudioButton, StudioModal, StudioParagraph } from '@studio/components';
import type { ButtonTexts, QuestionConfig, QuestionsProps } from '../types/QuestionsProps';
import { YesNoQuestion } from './Question/YesNoQuestion';
import { useFeedbackFormContext } from '../contexts/FeedbackFormContext';
import { TextQuestion } from './Question/TextQuestion';
import classes from './FeedbackForm.module.css';
import { getDefaultAnswerValueForQuestion } from '../utils/questionUtils';
import type { AnswerType } from '../types/AnswerType';
import { useTranslation } from 'react-i18next';

type FeedbackFormProps = {
  id: string;
  buttonTexts: ButtonTexts;
  heading: string;
  description: string;
  disclaimer?: string;
  questions: QuestionConfig[];
  position?: 'inline' | 'fixed';
  onSubmit: (answers: Record<string, AnswerType>, path: string) => void;
};

export function FeedbackForm({
  id,
  questions,
  buttonTexts,
  heading,
  description,
  disclaimer,
  position = 'inline',
  onSubmit,
}: FeedbackFormProps): React.ReactElement {
  const { answers, setAnswers, submitPath } = useFeedbackFormContext();
  const { t } = useTranslation();

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
    try {
      onSubmit(
        {
          ...answers,
          feedbackFormId: id,
        },
        submitPath,
      );
      handleCloseModal();
      toast.success(t('feedback.success_message'));
    } catch (error) {
      toast.error(t('feedback.error_message'));
    }
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
        <StudioParagraph size='sm' spacing={true}>
          {description}
        </StudioParagraph>
        {questions.map((question) => {
          return renderQuestion(question);
        })}
        {disclaimer && (
          <StudioParagraph size='xs' spacing={true} className={classes.disclaimer}>
            {disclaimer}
          </StudioParagraph>
        )}
        <StudioButton className={classes.submit} onClick={handleSubmit} color='success'>
          {buttonTexts.submit}
        </StudioButton>
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
}
