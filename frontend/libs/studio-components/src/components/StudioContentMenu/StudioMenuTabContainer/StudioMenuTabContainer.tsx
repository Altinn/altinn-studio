import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import classes from './StudioMenuTabContainer.module.css';
import { moveFocus } from '../utils/dom-utils';
import type { StudioMenuTabType } from '../types/StudioMenuTabType';

type StudioMenuTabProps<TabId extends string> = {
  children: ReactNode;
  contentTab: StudioMenuTabType<TabId>;
  isTabSelected: boolean;
  onClick: (tabId: TabId) => void;
};

export function StudioMenuTabContainer<TabId extends string>({
  children,
  contentTab,
  isTabSelected,
  onClick,
}: StudioMenuTabProps<TabId>): ReactElement {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    moveFocus(event);
    if (event.key === 'Enter') {
      event.preventDefault();
      onClick(contentTab.tabId);
    }
  };

  return (
    <div
      className={isTabSelected ? classes.selectedTab : classes.tab}
      onClick={() => onClick(contentTab.tabId)}
      role='tab'
      tabIndex={isTabSelected ? 0 : -1}
      onKeyDown={handleKeyDown}
      title={contentTab.tabName}
    >
      {children}
    </div>
  );
}
