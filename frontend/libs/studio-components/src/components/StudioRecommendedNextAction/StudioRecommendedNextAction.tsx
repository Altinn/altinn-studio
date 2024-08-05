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
      <Card.Header>
        {/* <div className={classes.StudioRecommendedNextActionContainer}> */}
        {/* <h3 className={classes.StudioRecommendedNextActionHeader}>{title}</h3> */}
        {title}
      </Card.Header>
      <Card.Content>
        {/* <div className={classes.StudioRecommendedNextActionContent}> */}
        <p>{description}</p>
        {children}
        {/* </div> */}
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
