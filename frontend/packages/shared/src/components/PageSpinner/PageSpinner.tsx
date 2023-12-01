import React from 'react';
import { AltinnSpinner } from 'app-shared/components';
import classes from './PageSpinner.module.css';
import { StudioCenter } from '@altinn/studio-components';

export type PageSpinnerProps = {
  spinnerText?: string;
};

export const PageSpinner = ({ spinnerText }: PageSpinnerProps) => {
  return (
    <StudioCenter>
      <AltinnSpinner spinnerText={spinnerText} size='xlarge' className={classes.spinnerText} />
    </StudioCenter>
  );
};
