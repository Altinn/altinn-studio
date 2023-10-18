import React, { ReactNode } from 'react';
import classes from './TabContent.module.css';

export type TabContentProps = {
  id: string;
  children: ReactNode;
};

/**
 * @component
 *    Wrapper around the tabs in the settings modal
 *
 * @example
 *    <TabContent id={id}>
 *      {displayContent()}
 *    </TabContent>
 *
 * @property {string}[id] - The id of the wrapper
 * @property {ReactNode}[children] - The content in the Tab
 *
 * @returns {ReactNode} - The rendered component
 */
export const TabContent = ({ id, children }: TabContentProps): ReactNode => {
  return (
    <div id={id} className={classes.tabContent} role='tabpanel'>
      {children}
    </div>
  );
};
