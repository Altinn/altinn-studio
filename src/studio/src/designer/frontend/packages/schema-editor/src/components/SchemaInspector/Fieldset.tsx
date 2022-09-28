import React, { ReactNode } from 'react';
import classes from './Fieldset.module.css';

interface InspectorHeaderProps {
  children: ReactNode;
  legend?: string;
}

export const Fieldset = ({ children, legend }: InspectorHeaderProps) => {
  return (
    <fieldset className={classes.root}>
      {legend && <legend>{legend}</legend>}
      {children}
    </fieldset>
  );
};
