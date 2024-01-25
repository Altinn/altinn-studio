import type { HTMLAttributes } from 'react';
import React, { forwardRef } from 'react';
import classes from './StudioPageSpinner.module.css';
import { StudioCenter, StudioSpinner } from '@studio/components';

export type StudioPageSpinnerProps = {
  spinnerText?: string;
} & HTMLAttributes<HTMLDivElement>;

export const StudioPageSpinner = forwardRef<HTMLDivElement, StudioPageSpinnerProps>(
  ({ spinnerText }, ref): JSX.Element => {
    return (
      <StudioCenter ref={ref} className={classes.container}>
        <StudioSpinner spinnerText={spinnerText} size='xlarge' className={classes.spinnerText} />
      </StudioCenter>
    );
  },
);

StudioPageSpinner.displayName = 'StudioPageSpinner';
