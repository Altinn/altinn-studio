import type { ReactNode } from 'react';
import React from 'react';
import classes from './TabContent.module.css';

export type TabContentProps = {
  children: ReactNode;
};

export const TabContent = ({ children }: TabContentProps): ReactNode => {
  return (
    <div className={classes.tabContent} role='tabpanel'>
      {children}
    </div>
  );
};
