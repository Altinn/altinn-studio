import React from 'react';
import classes from './CenterContainer.module.css';

type CenterContainerProps = {
  children: React.ReactNode;
};

export const CenterContainer = ({ children }: CenterContainerProps) => {
  return <div className={classes.root}>{children}</div>;
};
