import React from 'react';
import type { StudioButtonTabType } from '../types/StudioMenuTabType';
import { StudioMenuTab } from '../StudioMenuTab';
import { StudioMenuTabContainer } from '../StudioMenuTabContainer';
import { useStudioContentMenuContext } from '../context/StudioContentMenuContext';
import classes from './StudioButtonTab.module.css';

type StudioButtonTabProps<TabId extends string> = {
  contentTab: StudioButtonTabType<TabId>;
};

export function StudioButtonTab<TabId extends string>({
  contentTab,
}: StudioButtonTabProps<TabId>): React.ReactElement {
  const { selectedTabId, onChangeTab } = useStudioContentMenuContext();

  return (
    <StudioMenuTabContainer
      contentTab={contentTab}
      isTabSelected={selectedTabId === contentTab.tabId}
      onClick={() => onChangeTab(contentTab.tabId)}
    >
      <button className={classes.buttonTab} tabIndex={-1}>
        <div className={classes.icon}>{contentTab.icon}</div>
        <StudioMenuTab contentTab={contentTab} />
      </button>
    </StudioMenuTabContainer>
  );
}
