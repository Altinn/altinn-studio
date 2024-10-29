import type { ReactNode } from 'react';
import React from 'react';
import { StudioMenuTab } from '../StudioMenuTab';
import { useStudioContentMenuContext } from '../context/StudioContentMenuContext';
import classes from './StudioContentMenuLinkTab.module.css';
import { StudioLink } from '@studio/components';
import { moveFocus } from '../utils/dom-utils';

export type StudioContentMenuLinkTabProps<TabId extends string> = {
  icon: ReactNode;
  tabName: string;
  tabId: TabId;
  to: string;
  renderTab: (children: ReactNode) => React.ReactElement;
};

export function StudioContentMenuLinkTab<TabId extends string>({
  icon,
  tabName,
  tabId,
  to,
  renderTab,
}: StudioContentMenuLinkTabProps<TabId>): React.ReactElement {
  const { selectedTabId, onChangeTab } = useStudioContentMenuContext();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>) => {
    moveFocus(event);
  };

  const isTabSelected = selectedTabId === tabId;

  return (
    <StudioLink
      className={classes.linkTab}
      role='tab'
      tabIndex={0} // isTabSelected ? 0 : -1
      href={to}
      asChild
      onClick={() => onChangeTab(tabId)}
      onKeyDown={handleKeyDown}
    >
      {renderTab(<StudioMenuTab icon={icon} tabName={tabName} isTabSelected={isTabSelected} />)}
    </StudioLink>
  );
}

//<StudioContentMenuLinkTab icon={} tabName={} tabId={} to={} renderTabName={(children) => <a href={}>{children}</a>}/>
