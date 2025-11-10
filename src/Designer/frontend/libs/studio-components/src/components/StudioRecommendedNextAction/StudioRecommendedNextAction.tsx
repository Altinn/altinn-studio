import { StudioButton } from '../StudioButton';
import React, { useId } from 'react';
import classes from './StudioRecommendedNextAction.module.css';
import { StudioCard } from '../StudioCard';
import { StudioParagraph } from '../StudioParagraph';
import { StudioHeading } from '../StudioHeading';

export type StudioRecommendedNextActionProps = {
  onSave?: React.FormEventHandler<HTMLFormElement>;
  saveButtonText?: string;
  onSkip?: React.MouseEventHandler<HTMLButtonElement>;
  skipButtonText?: string;
  title?: string;
  description?: string;
  hideSaveButton?: boolean;
  hideSkipButton?: boolean;
  children: React.ReactNode;
};

export const StudioRecommendedNextAction = ({
  onSave,
  saveButtonText,
  onSkip,
  skipButtonText,
  title,
  description,
  hideSaveButton = false,
  hideSkipButton,
  children,
}: StudioRecommendedNextActionProps): React.ReactElement => {
  const formName = useId();
  return (
    <form
      id={formName}
      name={formName}
      onSubmit={(e) => {
        e.preventDefault();
        onSave?.(e);
      }}
      data-testid='recommendedNextActionCard'
    >
      <StudioCard>
        <StudioCard.Block>
          <StudioHeading data-size='xs'>{title}</StudioHeading>
        </StudioCard.Block>
        <StudioCard.Block>
          <StudioParagraph data-size='sm' className={classes.description}>
            {description}
          </StudioParagraph>
          <div className={classes.container}>{children}</div>
          <div className={classes.buttonGroup}>
            {!hideSaveButton && (
              <StudioButton type='submit' variant='primary'>
                {saveButtonText}
              </StudioButton>
            )}
            {!hideSkipButton && (
              <StudioButton type='button' onClick={onSkip} variant='tertiary'>
                {skipButtonText}
              </StudioButton>
            )}
          </div>
        </StudioCard.Block>
      </StudioCard>
    </form>
  );
};
