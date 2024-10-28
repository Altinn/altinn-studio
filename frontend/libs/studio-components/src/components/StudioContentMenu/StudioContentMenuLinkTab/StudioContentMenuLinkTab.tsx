import type { ReactNode } from 'react';
import React from 'react';
import { StudioMenuTab } from '../StudioMenuTab';
import { StudioMenuTabContainer } from '../StudioMenuTabContainer';
import { useStudioContentMenuContext } from '../context/StudioContentMenuContext';
import { Link, useNavigate } from 'react-router-dom';
import classes from './StudioContentMenuLinkTab.module.css';

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
  const navigate = useNavigate();

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onChangeTab(tabId);
      navigate(to);
    }
  };

  return (
    <StudioMenuTabContainer
      tabId={tabId}
      tabName={tabName}
      isTabSelected={selectedTabId === tabId}
      onClick={() => onChangeTab(tabId)}
      onKeyDown={handleKeyDown}
    >
      <Link className={classes.linkTab} to={to}>
        <StudioMenuTab icon={icon} tabName={tabName} />
      </Link>
    </StudioMenuTabContainer>
  );
}
