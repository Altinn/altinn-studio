import React, { forwardRef, type HTMLAttributes } from 'react';
import classes from './StudioPageSpinner.module.css';
import { StudioCenter, StudioSpinner } from '@studio/components';

export type StudioPageSpinnerProps = {
  spinnerTitle: string;
  showSpinnerTitle?: boolean;
} & HTMLAttributes<HTMLDivElement>;

export const StudioPageSpinner = forwardRef<HTMLDivElement, StudioPageSpinnerProps>(
  ({ spinnerTitle, showSpinnerTitle = false }, ref): JSX.Element => {
    return (
      <StudioCenter ref={ref} className={classes.container}>
        <StudioSpinner
          spinnerTitle={spinnerTitle}
          showSpinnerTitle={showSpinnerTitle}
          size='xlarge'
          className={classes.spinnerText}
        />
      </StudioCenter>
    );
  },
);

StudioPageSpinner.displayName = 'StudioPageSpinner';
