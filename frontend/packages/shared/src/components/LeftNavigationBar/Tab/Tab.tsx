import React, { ReactNode } from 'react';
import classes from './Tab.module.css';
import cn from 'classnames';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { Paragraph } from '@digdir/design-system-react';

export type TabProps = {
  /**
   * The navigation tab
   */
  tab: LeftNavigationTab;
  /**
   * Classname for navigation element
   */
  navElementClassName: string;
  /**
   * Id of the new tab clicked
   */
  newTabIdClicked: number;
  /**
   * Function to execute on blur
   * @returns void
   */
  onBlur: () => void;
  /**
   * Function to execute on click
   * @returns void
   */
  onClick: () => void;
};

/**
 * @component
 *    Displays a tab in the left navigation bar.
 *
 * @example
 *      const displayTabs = tabs.map((tab: LeftNavigationTab) => (
 *        <Tab
 *          tab={tab}
 *          key={tab.tabId}
 *          navElementClassName={classes.navigationElement}
 *          onBlur={() => setNewTabIdClicked(null)}
 *          onClick={() => handleClick(tab.tabId)}
 *          newTabIdClicked={newTabIdClicked}
 *        />
 *      ));
 *
 * @property {LeftNavigationTab}[tab] - The navigation tab
 * @property {string}[navElementClassName] - Classname for navigation element
 * @property {number}[newTabIdClicked] - Id of the new tab clicked
 * @property {function}[onBlur] - Function to execute on blur
 * @property {function}[onClick] - Function to execute on click
 *
 * @returns {ReactNode} - The rendered component
 */
export const Tab = ({
  tab,
  navElementClassName,
  newTabIdClicked,
  onBlur,
  onClick,
}: TabProps): ReactNode => {
  return (
    <button
      className={cn(
        tab.isActiveTab && classes.selected,
        newTabIdClicked === tab.tabId ? classes.newPage : navElementClassName
      )}
      onClick={onClick}
      onBlur={onBlur}
      type='button'
    >
      {tab.icon}
      <Paragraph size='small' short className={classes.buttonText}>
        {tab.tabName}
      </Paragraph>
    </button>
  );
};
