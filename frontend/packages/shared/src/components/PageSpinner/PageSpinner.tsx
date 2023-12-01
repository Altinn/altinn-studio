import React from 'react';
import { StudioSpinner } from '@altinn/studio-components';
import classes from './PageSpinner.module.css';
import { StudioCenter } from '@altinn/studio-components';

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
