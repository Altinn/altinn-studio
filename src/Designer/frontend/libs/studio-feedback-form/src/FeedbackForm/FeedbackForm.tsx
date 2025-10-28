import React, { useRef } from 'react';
import { toast } from 'react-toastify';
import { StudioButton, StudioParagraph, StudioDialog, StudioHeading } from '@studio/components';
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
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    submitFeedback({ ...answers, feedbackFormId: id }, submitPath)
      .then(() => {
        modalRef.current?.close();
        toast.success(t('feedback.success_message'));
      })
      .catch(() => {
        toast.error(t('feedback.error_message'));
      });
  };

  const renderQuestion = (question: QuestionConfig) => {
    const questionBaseProps: QuestionsProps = {
      id: question.id,
      label: question.questionText,
      onChange: handleAnswerChange,
      value: answers[question.id] || getDefaultAnswerValueForQuestion(question),
    };
    switch (question.type) {
      case 'yesNo':
        return (
          <YesNoQuestion
            key={question.id}
            buttonLabels={question.buttonLabels}
            {...questionBaseProps}
          />
        );
      case 'text':
        return <TextQuestion key={question.id} {...questionBaseProps} />;
      default:
        return null;
    }
  };
  return (
    <StudioDialog.TriggerContext>
      <StudioDialog.Trigger className={position === 'fixed' ? classes.fixed : undefined}>
        {buttonTexts.trigger}
      </StudioDialog.Trigger>
      <StudioDialog ref={modalRef} onClose={handleCloseModal}>
        <StudioDialog.Block>
          <StudioHeading level={2}>{heading}</StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block>
          <StudioParagraph spacing>{description}</StudioParagraph>
          {questions.map((question) => {
            return renderQuestion(question);
          })}
          {disclaimer && (
            <StudioParagraph data-size='xs' className={classes.disclaimer} spacing>
              {disclaimer}
            </StudioParagraph>
          )}
          <StudioButton onClick={handleSubmit} data-color='success'>
            {buttonTexts.submit}
          </StudioButton>
        </StudioDialog.Block>
      </StudioDialog>
    </StudioDialog.TriggerContext>
  );
}
