import React from 'react';
import type { ReactElement } from 'react';
import { StudioContentMenu } from './';
import classes from './StudioContentMenuStoryExample.module.css';
import type { StudioContentMenuButtonTabProps } from './StudioContentMenuButtonTab';
import type { StudioContentMenuLinkTabProps } from './StudioContentMenuLinkTab';

export type StudioContentMenuStoryExampleProps<TabId extends string> = {
  buttonTabs: StudioContentMenuButtonTabProps<TabId>[];
  linkTabs: StudioContentMenuLinkTabProps<TabId>[];
  selectedTabId: TabId;
  onChangeTab: (tabId: TabId) => void;
};

export function StudioContentMenuStoryExample<TabId extends string>({
  selectedTabId,
  onChangeTab,
  buttonTabs,
  linkTabs,
}: StudioContentMenuStoryExampleProps<TabId>): ReactElement {
  return (
    <div className={classes.contentMenuWrapper} data-size='sm'>
      <StudioContentMenu selectedTabId={selectedTabId} onChangeTab={onChangeTab}>
        <StudioContentMenu.ButtonTab
          icon={buttonTabs[0].icon}
          tabId={buttonTabs[0].tabId}
          tabName={buttonTabs[0].tabName}
        />
        <StudioContentMenu.ButtonTab
          icon={buttonTabs[1].icon}
          tabId={buttonTabs[1].tabId}
          tabName={buttonTabs[1].tabName}
        />
        <StudioContentMenu.ButtonTab
          icon={buttonTabs[2].icon}
          tabId={buttonTabs[2].tabId}
          tabName={buttonTabs[2].tabName}
        />
        <StudioContentMenu.LinkTab
          icon={linkTabs[0].icon}
          tabId={linkTabs[0].tabId}
          tabName={linkTabs[0].tabName}
          renderTab={linkTabs[0].renderTab}
        />
      </StudioContentMenu>
    </div>
  );
}
