import React, { ReactNode } from 'react';
import classes from './Fieldset.module.css';

interface FieldsetProps {
  children: ReactNode;
  legend?: string;
}

export const Fieldset = ({ children, legend }: FieldsetProps) => {
  return (
    <fieldset className={classes.root}>
      {legend && <legend>{legend}</legend>}
      {children}
    </fieldset>
  );
};
