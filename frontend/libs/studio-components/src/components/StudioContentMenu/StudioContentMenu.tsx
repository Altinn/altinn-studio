import React, { useState } from 'react';
import type { ReactElement } from 'react';
import classes from './StudioContentMenu.module.css';
import { StudioMenuTab } from './StudioMenuTab';
import type { StudioMenuTabType } from './StudioMenuTab';

type StudioContentMenuProps<TabId extends string> = {
  contentTabs: StudioMenuTabType<TabId>[];
  selectedTabId: TabId;
  onChangeTab: (tabId: TabId) => void;
};

export function StudioContentMenu<TabId extends string>({
  contentTabs,
  selectedTabId,
  onChangeTab,
}: StudioContentMenuProps<TabId>): ReactElement {
  const [selectedTab, setSelectedTab] = useState<string>(selectedTabId ?? contentTabs[0]?.tabId);
  const handleChangeTab = (tabId: TabId) => {
    onChangeTab(tabId);
    setSelectedTab(tabId);
  };

  return (
    <div className={classes.pagesRouterContainer} role='tablist'>
      {contentTabs.map((contentTab) => (
        <StudioMenuTab
          key={contentTab.tabId}
          contentTab={contentTab}
          isTabSelected={contentTab.tabId === selectedTab}
          onClick={() => handleChangeTab(contentTab.tabId)}
        />
      ))}
    </div>
  );
}
