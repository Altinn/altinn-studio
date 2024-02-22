import React, { type ReactNode } from 'react';
import classes from './PageContainer.module.css';

type PageContainerProps = {
  children: ReactNode;
};

export const PageContainer = ({ children }: PageContainerProps) => {
  return <div className={classes.pageContainer}>{children}</div>;
};
