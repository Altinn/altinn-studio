import React from 'react';
import classes from './AltinnPopper.module.css';
import { Popper } from '@mui/material';

export type AltinnPopperProps = {
  styleObj?: object;
  message?: string;
  anchorEl: any;
};

export const AltinnPopper = ({ anchorEl, styleObj, message }: AltinnPopperProps) => (
  <Popper
    open={Boolean(anchorEl)}
    anchorEl={anchorEl}
    className={classes.snackbarError}
    style={styleObj}
    placement={'bottom-start'}
  >
    {message}
  </Popper>
);
