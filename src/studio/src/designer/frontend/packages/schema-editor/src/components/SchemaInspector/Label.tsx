import React, { ReactNode } from 'react';
import classes from './Label.module.css';

interface InspectorHeaderProps {
  children: ReactNode;
  htmlFor?: string;
}

export const Label = ({ children, htmlFor }: InspectorHeaderProps) => {
  return (
    <label className={classes.root} htmlFor={htmlFor}>
      {children}
    </label>
  );
};
