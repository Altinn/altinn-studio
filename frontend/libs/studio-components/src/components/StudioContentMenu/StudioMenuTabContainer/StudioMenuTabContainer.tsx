import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import classes from './StudioMenuTabContainer.module.css';
import { moveFocus } from '../utils/dom-utils';

type StudioMenuTabProps<TabId extends string> = {
  children: ReactNode;
  tabId: TabId;
  tabName: string;
  isTabSelected: boolean;
  onClick: (tabId: TabId) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
};

export function StudioMenuTabContainer<TabId extends string>({
  children,
  tabId,
  tabName,
  isTabSelected,
  onClick,
  onKeyDown,
}: StudioMenuTabProps<TabId>): ReactElement {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    moveFocus(event);
    if (event.key === 'Enter') {
      event.preventDefault();
      onClick(tabId);
    }
  };

  return (
    <div
      className={isTabSelected ? classes.selectedTab : classes.tab}
      onClick={() => onClick(tabId)}
      role='tab'
      tabIndex={isTabSelected ? 0 : -1}
      onKeyDown={onKeyDown ?? handleKeyDown}
      title={tabName}
    >
      {children}
    </div>
  );
}
