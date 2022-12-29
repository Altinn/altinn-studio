import React from 'react';
import classes from './AltinnSpinner.module.css';
import { CircularProgress } from '@mui/material';

export interface IAltinnSpinnerComponentProvidedProps {
  spinnerText?: string;
  className?: string;
}

export const AltinnSpinner = (props: IAltinnSpinnerComponentProvidedProps) => (
  <div className={props.className}>
    <CircularProgress className={classes.spinner} />
    {props.spinnerText && <div className={classes.spinnerText}>{props.spinnerText}</div>}
  </div>
);
