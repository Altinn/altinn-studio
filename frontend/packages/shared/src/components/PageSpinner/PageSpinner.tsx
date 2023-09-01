import React from 'react';
import { AltinnSpinner } from 'app-shared/components';
import classes from './PageSpinner.module.css';
import { Center } from '../Center';

export type PageSpinnerProps = {
  spinnerText?: string;
};

export const PageSpinner = ({ spinnerText }: PageSpinnerProps) => {
  return (
    <Center>
      <AltinnSpinner spinnerText={spinnerText} size='3xLarge' className={classes.spinnerText} />
    </Center>
  );
}
