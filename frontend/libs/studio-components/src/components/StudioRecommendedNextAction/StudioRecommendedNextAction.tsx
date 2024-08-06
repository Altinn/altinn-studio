import { StudioButton } from '../StudioButton';
import React from 'react';
import classes from './StudioRecommendedNextAction.module.css';
import { Card } from '@digdir/designsystemet-react';

export interface StudioRecommendedNextActionProps {
  onSave: React.MouseEventHandler<HTMLButtonElement>;
  saveButtonText: string;
  onSkip: React.MouseEventHandler<HTMLButtonElement>;
  skipButtonText: string;
  title: string;
  description: string;
  hideSaveButton: boolean;
  children: React.ReactNode;
}

export const StudioRecommendedNextAction = ({
  onSave,
  saveButtonText,
  onSkip,
  skipButtonText,
  title,
  description,
  hideSaveButton,
  children,
}: StudioRecommendedNextActionProps): React.ReactElement => {
  return (
    <Card>
      <Card.Header>{title}</Card.Header>
      <Card.Content>
        <p>{description}</p>
        {children}
        <div className={classes.buttonGroup}>
          {!hideSaveButton && (
            <StudioButton onClick={onSave} variant='primary'>
              {saveButtonText}
            </StudioButton>
          )}
          <StudioButton onClick={onSkip} variant='tertiary'>
            {skipButtonText}
          </StudioButton>
        </div>
      </Card.Content>
    </Card>
  );
};
