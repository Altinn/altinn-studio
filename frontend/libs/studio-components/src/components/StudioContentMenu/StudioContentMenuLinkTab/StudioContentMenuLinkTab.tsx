import type { ReactNode } from 'react';
import React from 'react';
import { StudioMenuTab } from '../StudioMenuTab';
import { StudioMenuTabContainer } from '../StudioMenuTabContainer';
import { useStudioContentMenuContext } from '../context/StudioContentMenuContext';
import { Link } from 'react-router-dom';

export type StudioContentMenuLinkTabProps<TabId extends string> = {
  icon: ReactNode;
  tabName: string;
  tabId: TabId;
  to: string;
};

export function StudioContentMenuLinkTab<TabId extends string>({
  icon,
  tabName,
  tabId,
  to,
}: StudioContentMenuLinkTabProps<TabId>): React.ReactElement {
  const { selectedTabId, onChangeTab } = useStudioContentMenuContext();

  return (
    <StudioMenuTabContainer
      tabId={tabId}
      tabName={tabName}
      isTabSelected={selectedTabId === tabId}
      onClick={() => onChangeTab(tabId)}
    >
      <Link to={to} tabIndex={-1}>
        <StudioMenuTab icon={icon} tabName={tabName} />
      </Link>
    </StudioMenuTabContainer>
  );
}
