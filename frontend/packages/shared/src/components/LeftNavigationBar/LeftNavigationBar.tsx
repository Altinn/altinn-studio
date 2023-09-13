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
   * Function to be executed on click upper tab back button
   * @returns void
   */
  onClickUpperTabBackButton?: () => void;
  /**
   * The text on the back button
   */
  backButtonText?: string;
};

/**
 * @component
 *    Displays a navigation bar component to the left of the parent component.
 *
 * @example
 *    <LeftNavigationBar
 *        tabs={listOfTabsOfTypeLeftNavigationTab}
 *        upperTab='backButton'
 *        onClickUpperTabBackButton={goBack}
 *        backButtonText={t('resourceadm.left_nav_bar_back')}
 *    />
 *
 * @property {LeftNavigationBar[]}[tabs] - List of navigation tabs
 * @property {'backButton' | 'searchField' | undefined}[upperTab] - The upper tab
 * @property {function}[onClickUpperTabBackButton] - Function to be executed on click upper tab back button
 * @property {string}[backButtonText] - The text on the back button
 *
 * @returns {ReactNode} - The rendered component
 */
export const LeftNavigationBar = ({
  tabs,
  upperTab = undefined,
  onClickUpperTabBackButton,
  backButtonText = '',
}: LeftNavigationBarProps): ReactNode => {
  const [newTabIdClicked, setNewTabIdClicked] = useState<number | null>(null);

  const handleClick = (tabId: number) => {
    const tabClicked = tabs.find((tab: LeftNavigationTab) => tab.tabId === tabId);
    if (tabClicked && !tabClicked.isActiveTab) {
      setNewTabIdClicked(tabId);
      tabClicked.onClick(tabId);
    }
  };

  const displayUpperTab = () => {
    if (upperTab === 'backButton' && onClickUpperTabBackButton && backButtonText) {
      return (
        <GoBackButton
          className={classes.navigationElement}
          onClick={onClickUpperTabBackButton}
          text={backButtonText}
        />
      );
    }
    return null;
  };

  const displayTabs = tabs.map((tab: LeftNavigationTab) => (
    <Tab
      tab={tab}
      key={tab.tabId}
      navElementClassName={classes.navigationElement}
      onBlur={() => setNewTabIdClicked(null)}
      onClick={() => handleClick(tab.tabId)}
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
