import React from 'react';
import type { StudioContentMenuProps } from './StudioContentMenu';
import { StudioContentMenu } from './StudioContentMenu';
import classes from './StudioContentMenuWrapper.module.css';

export type StudioContentMenuWrapperProps<TabId extends string> = StudioContentMenuProps<TabId>;

export function StudioContentMenuWrapper<TabId extends string>({
  contentTabs,
  selectedTabId,
  onChangeTab,
}: StudioContentMenuWrapperProps<TabId>) {
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
