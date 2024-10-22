import React from 'react';
import { StudioContentMenu } from './StudioContentMenu';
import type { MenuTab } from './StudioMenuTab/StudioMenuTab';
import classes from './StudioContentMenuWrapper.module.css';

export type StudioContentMenuWrapperProps = {
  contentTabs: MenuTab<string>[];
  selectedTabId: string | undefined;
  onChangeTab: (tabId: string) => void;
};

export function StudioContentMenuWrapper({
  contentTabs,
  selectedTabId,
  onChangeTab,
}: StudioContentMenuWrapperProps) {
  return (
    <div className={classes.contentMenuWrapper}>
      <StudioContentMenu
        contentTabs={contentTabs}
        selectedTabId={selectedTabId}
        onChangeTab={onChangeTab}
      />
    </div>
  );
}
