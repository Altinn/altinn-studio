import React, { useState } from 'react';
import type { ReactElement } from 'react';
import classes from './StudioContentMenu.module.css';
import { StudioMenuTab } from './StudioMenuTab/StudioMenuTab';
import type { MenuTab } from './StudioMenuTab/StudioMenuTab';

type StudioContentMenuProps<TabId extends string> = {
  contentTabs: MenuTab<TabId>[];
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
          icon={contentTab.icon}
          tabName={contentTab.tabName}
          tabId={contentTab.tabId}
          isTabSelected={contentTab.tabId === selectedTab}
          onClick={() => handleChangeTab(contentTab.tabId)}
        />
      ))}
    </div>
  );
}
