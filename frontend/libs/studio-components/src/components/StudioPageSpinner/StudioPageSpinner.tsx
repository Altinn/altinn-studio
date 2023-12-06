import React, { HTMLAttributes, forwardRef } from 'react';
import classes from './StudioPageSpinner.module.css';
import { StudioCenter, StudioSpinner } from '@studio/components';

export type StudioPageSpinnerProps = {
  spinnerText?: string;
} & HTMLAttributes<HTMLDivElement>;

export const StudioPageSpinner = forwardRef<HTMLDivElement, StudioPageSpinnerProps>(
  ({ spinnerText }, ref): JSX.Element => {
    return (
      <StudioCenter ref={ref}>
        <StudioSpinner spinnerText={spinnerText} size='xlarge' className={classes.spinnerText} />
      </StudioCenter>
    );
  },
);

StudioPageSpinner.displayName = 'StudioPageSpinner';
