import React from 'react';
import { StudioButton, StudioModal } from '@studio/components-legacy';
import { StudioParagraph } from '@studio/components';
import classes from './FeedbackForm.module.css';
import { useTranslation } from 'react-i18next';

type FeedbackFormProps = {
  id: string;
  buttonTexts: ButtonTexts;
  heading: string;
  description: string;
  disclaimer?: string;
  questions: QuestionConfig[];
  position?: 'inline' | 'fixed';
};

export function Assistant({
  id,
  questions,
  buttonTexts,
  heading,
  description,
  disclaimer,
  position = 'inline',
}: FeedbackFormProps): React.ReactElement {
  const { t } = useTranslation();

  const handleSubmit = () => {
    onSubmit();
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
