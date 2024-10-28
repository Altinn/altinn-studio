import type { ReactNode } from 'react';
import React from 'react';
import { StudioMenuTab } from '../StudioMenuTab';
import { StudioMenuTabContainer } from '../StudioMenuTabContainer';
import { useStudioContentMenuContext } from '../context/StudioContentMenuContext';
import classes from './StudioContentMenuButtonTab.module.css';

export type StudioContentMenuButtonTabProps<TabId extends string> = {
  icon: ReactNode;
  tabName: string;
  tabId: TabId;
};

export function StudioContentMenuButtonTab<TabId extends string>({
  icon,
  tabName,
  tabId,
}: StudioContentMenuButtonTabProps<TabId>): React.ReactElement {
  const { selectedTabId, onChangeTab } = useStudioContentMenuContext();

  return (
    <StudioMenuTabContainer
      tabId={tabId}
      tabName={tabName}
      isTabSelected={selectedTabId === tabId}
      onClick={() => onChangeTab(tabId)}
    >
      <button className={classes.buttonTab} tabIndex={-1}>
        <StudioMenuTab icon={icon} tabName={tabName} />
      </button>
    </StudioMenuTabContainer>
  );
}
