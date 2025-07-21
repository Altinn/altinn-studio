import React from 'react';
import type { ReactNode, ReactElement } from 'react';
import classes from './TabPageWrapper.module.css';
import cn from 'classnames';

export type TabPageWrapperProps = {
  children: ReactNode;
  hasInlineSpacing?: boolean;
};

export function TabPageWrapper({
  children,
  hasInlineSpacing = true,
}: TabPageWrapperProps): ReactElement {
  return (
    <div
      className={cn(classes.tabPageWrapper, { [classes.wrapperSpaceInline]: hasInlineSpacing })}
      role='tabpanel'
    >
      {children}
    </div>
  );
}
