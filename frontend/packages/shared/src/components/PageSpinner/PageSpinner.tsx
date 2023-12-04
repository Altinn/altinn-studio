import React from 'react';
import classes from './PageSpinner.module.css';
import { StudioCenter, StudioSpinner } from '@studio/components';

export type PageSpinnerProps = {
  spinnerText?: string;
};

export const PageSpinner = ({ spinnerText }: PageSpinnerProps) => {
  return (
    <StudioCenter>
      <StudioSpinner spinnerText={spinnerText} size='xlarge' className={classes.spinnerText} />
    </StudioCenter>
  );
};
