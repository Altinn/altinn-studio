import React, { KeyboardEventHandler, ReactNode } from 'react';
import classes from './Tab.module.css';
import cn from 'classnames';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { TabWrapper } from './TabWrapper';

export type TabProps = {
  tab: LeftNavigationTab;
  navElementClassName: string;
  newTabIdClicked: string;
  onBlur: () => void;
  onClick: () => void;
  tabIndex: number;
  onKeyDown: (name: string) => (event: Parameters<KeyboardEventHandler>[0]) => void;
};

/**
 * @component
 *    Displays a tab in the left navigation bar.
 *
 * @example
 *      const displayTabs = tabs.map((tab: LeftNavigationTab, i: number) => (
 *        <Tab
 *          tab={tab}
 *          key={tab.tabId}
 *          navElementClassName={classes.navigationElement}
 *          newTabIdClicked={newTabIdClicked}
 *          onBlur={() => setNewTabIdClicked(null)}
 *          onClick={() => handleClick(tab.tabId)}
 *          tabIndex={focusIndex === i ? 0 : -1}
 *          onKeyDown={handleKeyDown}
 *        />
 *      ));
 *
 * @property {LeftNavigationTab}[tab] - The navigation tab
 * @property {string}[navElementClassName] - Classname for navigation element
 * @property {string}[newTabIdClicked] - Id of the new tab clicked
 * @property {function}[onBlur] - Function to execute on blur
 * @property {function}[onClick] - Function to execute on click
 * @property {number}[tabIndex] - The index of the tab
 * @property {function}[onKeyDown] - Function to be executed on key press
 *
 * @returns {ReactNode} - The rendered component
 */
export const Tab = ({
  tab,
  navElementClassName,
  newTabIdClicked,
  onBlur,
  onClick,
  tabIndex,
  onKeyDown,
}: TabProps): ReactNode => {
  const { t } = useTranslation();

  return (
    <TabWrapper
      className={cn(
        tab.isActiveTab && classes.selected,
        newTabIdClicked === tab.tabId ? classes.newPage : navElementClassName,
      )}
      onClick={onClick}
      onBlur={onBlur}
      action={tab.action}
      tabIndex={tabIndex}
      tabName={tab.tabName}
      onKeyDown={onKeyDown}
    >
      {tab.icon}
      <Paragraph as='span' size='small' short className={classes.buttonText}>
        {t(tab.tabName)}
      </Paragraph>
    </TabWrapper>
  );
};
