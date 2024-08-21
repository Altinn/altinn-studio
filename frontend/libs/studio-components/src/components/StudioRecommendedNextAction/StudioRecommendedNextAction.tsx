import { StudioButton } from '../StudioButton';
import React, { useId } from 'react';
import classes from './StudioRecommendedNextAction.module.css';
import { StudioCard } from '../StudioCard';
import { StudioParagraph } from '@studio/components';
import { Heading } from '@digdir/designsystemet-react';

export type StudioRecommendedNextActionProps = {
  onSave: React.FormEventHandler<HTMLFormElement>;
  saveButtonText: string;
  onSkip: React.MouseEventHandler<HTMLButtonElement>;
  skipButtonText: string;
  title: string;
  description: string;
  hideSaveButton?: boolean;
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
  children,
}: StudioRecommendedNextActionProps): React.ReactElement => {
  const formName = useId();
  return (
    <form name={formName} onSubmit={onSave}>
      <StudioCard>
        <StudioCard.Header>
          <Heading size='xs'>{title}</Heading>
        </StudioCard.Header>
        <StudioCard.Content>
          <StudioParagraph size='sm' className={classes.description}>
            {description}
          </StudioParagraph>
          {children}
          <div className={classes.buttonGroup}>
            {!hideSaveButton && (
              <StudioButton type='submit' variant='primary'>
                {saveButtonText}
              </StudioButton>
            )}
            <StudioButton onClick={onSkip} variant='tertiary'>
              {skipButtonText}
            </StudioButton>
          </div>
        </StudioCard.Content>
      </StudioCard>
    </form>
  );
};
