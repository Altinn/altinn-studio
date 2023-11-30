import React from 'react';
import { StudioSpinner } from '@altinn/studio-components';
import classes from './PageSpinner.module.css';
import { Center } from '../Center';

export type PageSpinnerProps = {
  spinnerText?: string;
};

export const PageSpinner = ({ spinnerText }: PageSpinnerProps) => {
  return (
    <Center>
      <StudioSpinner spinnerText={spinnerText} size='xlarge' className={classes.spinnerText} />
    </Center>
  );
};
