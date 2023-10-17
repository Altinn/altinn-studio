import React, { ReactNode } from 'react';
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
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
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
 *          newTabIdClicked={newTabIdClicked}
 *          onBlur={() => setNewTabIdClicked(null)}
 *          onClick={() => handleClick(tab.tabId)}
 *          onKeyDown={handleKeyDown}
 *        />
 *      ));
 *
 * @property {LeftNavigationTab}[tab] - The navigation tab
 * @property {string}[navElementClassName] - Classname for navigation element
 * @property {string}[newTabIdClicked] - Id of the new tab clicked
 * @property {function}[onBlur] - Function to execute on blur
 * @property {function}[onClick] - Function to execute on click
 * @property {function}[onKeyDown] - Function to execute on keypress
 *
 * @returns {ReactNode} - The rendered component
 */
export const Tab = ({
  tab,
  navElementClassName,
  newTabIdClicked,
  onBlur,
  onClick,
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
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      action={tab.action}
    >
      {tab.icon}
      <Paragraph as='span' size='small' short className={classes.buttonText}>
        {t(tab.tabName)}
      </Paragraph>
    </TabWrapper>
  );
};
