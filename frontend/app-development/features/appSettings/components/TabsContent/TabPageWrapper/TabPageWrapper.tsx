import React from 'react';
import type { ReactNode, ReactElement } from 'react';
import classes from './TabPageWrapper.module.css';

export type TabPageWrapperProps = {
  children: ReactNode;
};

export function TabPageWrapper({ children }: TabPageWrapperProps): ReactElement {
  return (
    <div className={classes.tabPageWrapper} role='tabpanel'>
      {children}
    </div>
  );
}
