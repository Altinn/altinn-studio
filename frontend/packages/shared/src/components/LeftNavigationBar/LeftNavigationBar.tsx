import React, { ReactNode, useState } from 'react';
import classes from './LeftNavigationBar.module.css';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { GoBackButton } from './GoBackButton';
import { Tab } from './Tab';

export type LeftNavigationBarProps = {
  tabs: LeftNavigationTab[];
  upperTab?: 'backButton' | 'searchField' | undefined;
  onClickUpperTabBackButton?: () => void;
  backButtonText?: string;
};

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
          navElementClassName={classes.navigationElement}
          onClickBackButton={onClickUpperTabBackButton}
          backButtonText={backButtonText}
        />
      );
    }
    if (upperTab === 'searchField') {
      // TODO - Add Search field component. Issue: #11058.
      return <div>TODO - search field</div>;
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
