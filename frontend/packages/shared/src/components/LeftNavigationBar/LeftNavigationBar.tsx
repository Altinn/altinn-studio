import React, { ReactNode, useState } from 'react';
import classes from './LeftNavigationBar.module.css';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { GoBackButton } from './GoBackButton';
import { Tab } from './Tab';

export type LeftNavigationBarProps = {
  /**
   * List of navigation tabs
   */
  tabs: LeftNavigationTab[];
  /**
   * The upper tab
   */
  upperTab?: 'backButton' | undefined;
  /**
   * Href for the back link
   */
  backLink?: string;
  /**
   * The text on the back link
   */
  backLinkText?: string;
};

/**
 * @component
 *    Displays a navigation bar component to the left of the parent component.
 *
 * @example
 *    <LeftNavigationBar
 *        tabs={listOfTabsOfTypeLeftNavigationTab}
 *        upperTab='backButton'
 *        backLink='./someUrl'
 *        backLinkText={t('resourceadm.left_nav_bar_back')}
 *    />
 *
 * @property {LeftNavigationBar[]}[tabs] - List of navigation tabs
 * @property {'backButton' | undefined}[upperTab] - The upper tab
 * @property {string}[backLink] - Href for the back link
 * @property {string}[backLinkText] - The text on the back link
 *
 * @returns {ReactNode} - The rendered component
 */
export const LeftNavigationBar = ({
  tabs,
  upperTab = undefined,
  backLink,
  backLinkText = '',
}: LeftNavigationBarProps): ReactNode => {
  const [newTabIdClicked, setNewTabIdClicked] = useState<string | null>(null);

  /**
   * Function to be executed when the tab is clicked
   */
  const handleClick = (tabId: string) => {
    const tabClicked = tabs.find((tab: LeftNavigationTab) => tab.tabId === tabId);
    if (tabClicked && !tabClicked.isActiveTab) {
      setNewTabIdClicked(tabId);
      tabClicked.action.onClick(tabId);
    }
  };

  /**
   * Dispalys the uppermost tab if there is one
   * @returns
   */
  const displayUpperTab = () => {
    if (upperTab === 'backButton' && backLink && backLinkText) {
      return (
        <GoBackButton className={classes.navigationElement} to={backLink} text={backLinkText} />
      );
    }
    return null;
  };

  /**
   * Displays all the tabs
   */
  const displayTabs = tabs.map((tab: LeftNavigationTab) => (
    <Tab
      tab={tab}
      onClick={() => handleClick(tab.tabId)}
      key={tab.tabId}
      navElementClassName={classes.navigationElement}
      onBlur={() => setNewTabIdClicked(null)}
      newTabIdClicked={newTabIdClicked}
    />
  ));

  return (
    <div className={classes.navigationBar}>
      <div className={classes.navigationElements}>
        {displayUpperTab()}
        {displayTabs}
      </div>
    </div>
  );
};
