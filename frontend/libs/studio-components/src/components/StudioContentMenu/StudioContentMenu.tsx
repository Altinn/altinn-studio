import React, { useState } from 'react';
import type { ReactElement } from 'react';
import classes from './StudioContentMenu.module.css';
import { StudioMenuTabContainer } from './StudioMenuTab';
import type { StudioMenuTabType } from './types/StudioMenuTabType';

export type StudioContentMenuProps<TabId extends string> = {
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
    <div className={classes.tabsContainer} role='tablist'>
      {contentTabs.map((contentTab) => (
        <StudioMenuTabContainer
          key={contentTab.tabId}
          contentTab={contentTab}
          isTabSelected={contentTab.tabId === selectedTab}
          onClick={() => handleChangeTab(contentTab.tabId)}
        />
      ))}
    </div>
  );
}
