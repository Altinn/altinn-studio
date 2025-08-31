import React, { useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { StudioModal } from '@studio/components-legacy';
import { StudioButton } from '@studio/components';
import { StudioParagraph } from '@studio/components';
import type { ButtonTexts, QuestionConfig, QuestionsProps } from '../types/QuestionsProps';
import { YesNoQuestion } from './Question/YesNoQuestion';
import { useFeedbackFormContext } from '../contexts/FeedbackFormContext';
import { TextQuestion } from './Question/TextQuestion';
import classes from './FeedbackForm.module.css';
import { getDefaultAnswerValueForQuestion } from '../utils/questionUtils';
import { useTranslation } from 'react-i18next';
import { submitFeedback } from '../utils/submitUtils';

type FeedbackFormProps = {
  id: string;
  buttonTexts: ButtonTexts;
  heading: string;
  description: string;
  disclaimer?: string;
  questions: QuestionConfig[];
  position?: 'inline' | 'fixed';
};

export function FeedbackForm({
  id,
  questions,
  buttonTexts,
  heading,
  description,
  disclaimer,
  position = 'inline',
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
    submitFeedback({ ...answers, feedbackFormId: id }, submitPath)
      .then(() => {
        handleCloseModal();
        toast.success(t('feedback.success_message'));
      })
      .catch(() => {
        toast.error(t('feedback.error_message'));
      });
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
        <StudioParagraph spacing>{description}</StudioParagraph>
        {questions.map((question) => {
          return renderQuestion(question);
        })}
        {disclaimer && (
          <StudioParagraph data-size='xs' className={classes.disclaimer} spacing>
            {disclaimer}
          </StudioParagraph>
        )}
        <StudioButton onClick={handleSubmit} color='success'>
          {buttonTexts.submit}
        </StudioButton>
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
}
