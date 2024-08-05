import { StudioButton } from '../StudioButton';
import React from 'react';
import classes from './StudioRecommendedNextAction.module.css';
import { Card } from '@digdir/designsystemet-react';

export interface StudioRecommendedNextActionProps {
  onSave: React.MouseEventHandler<HTMLButtonElement>;
  onSkip: React.MouseEventHandler<HTMLButtonElement>;
  title: string;
  description: string;
  validForm: boolean;
  children: React.ReactNode;
}

export const StudioRecommendedNextAction = ({
  onSave,
  onSkip,
  title,
  description,
  validForm,
  children,
}: StudioRecommendedNextActionProps): React.ReactElement => {
  return (
    <Card>
      <Card.Header>{title}</Card.Header>
      <Card.Content>
        <p>{description}</p>
        {children}
        <div className={classes.buttonGroup}>
          {validForm && (
            <StudioButton hidden={!validForm} onClick={onSave} variant='primary'>
              Lagre
            </StudioButton>
          )}
          <StudioButton onClick={onSkip} variant='tertiary'>
            Hopp over
          </StudioButton>
        </div>
      </Card.Content>
    </Card>
  );
};
