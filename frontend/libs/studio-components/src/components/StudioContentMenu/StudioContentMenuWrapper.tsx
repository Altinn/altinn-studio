import React from 'react';
import { StudioContentMenu } from './';
import classes from './StudioContentMenuWrapper.module.css';
import type { StudioButtonTabType, StudioLinkTabType } from './types/StudioMenuTabType';

export type StudioContentMenuWrapperProps<TabId extends string> = {
  buttonTabs: StudioButtonTabType<TabId>[];
  linkTabs: StudioLinkTabType<TabId>[];
  selectedTabId: TabId;
  onChangeTab: (tabId: TabId) => void;
};

export function StudioContentMenuWrapper<TabId extends string>({
  selectedTabId,
  onChangeTab,
  buttonTabs,
  linkTabs,
}: StudioContentMenuWrapperProps<TabId>) {
  return (
    <div className={classes.contentMenuWrapper}>
      <StudioContentMenu selectedTabId={selectedTabId} onChangeTab={onChangeTab}>
        <StudioContentMenu.ButtonTab contentTab={buttonTabs[0]} />
        <StudioContentMenu.ButtonTab contentTab={buttonTabs[1]} />
        <StudioContentMenu.ButtonTab contentTab={buttonTabs[2]} />
        <StudioContentMenu.LinkTab contentTab={linkTabs[0]} />
      </StudioContentMenu>
    </div>
  );
}
