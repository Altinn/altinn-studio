import type { ReactNode } from 'react';
import React from 'react';
import classes from './CenterContainer.module.css';

type CenterContainerProps = {
  children: ReactNode;
};

export const CenterContainer = ({ children }: CenterContainerProps) => {
  return <div className={classes.root}>{children}</div>;
};
