import React, { ReactNode } from 'react';
import classes from './Label.module.css';

interface ILabelProps {
  children: ReactNode;
  htmlFor?: string;
}

export const Label = ({ children, htmlFor }: ILabelProps) => {
  return (
    <label className={classes.root} htmlFor={htmlFor}>
      {children}
    </label>
  );
};
