import type { ReactNode } from 'react';
import React from 'react';
import classes from './TabContent.module.css';

export type TabContentProps = {
  children: ReactNode;
};

/**
 * @component
 *    Wrapper around the tabs in the settings modal
 *
 * @example
 *    <TabContent>
 *      {displayContent()}
 *    </TabContent>
 *
 * @property {ReactNode}[children] - The content in the Tab
 *
 * @returns {ReactNode} - The rendered component
 */
export const TabContent = ({ children }: TabContentProps): ReactNode => {
  return (
    <div className={classes.tabContent} role='tabpanel'>
      {children}
    </div>
  );
};
