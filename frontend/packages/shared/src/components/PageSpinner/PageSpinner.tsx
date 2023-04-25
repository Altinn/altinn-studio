import React from 'react';
import { AltinnSpinner } from 'app-shared/components';
import classes from './PageSpinner.module.css';

type PageSpinnerProps = {
  text: string;
};
export const PageSpinner = ({ text }: PageSpinnerProps) => (
  <div className={classes.container}>
    <AltinnSpinner spinnerText={text} className={classes.spinnerText} />
  </div>
);
