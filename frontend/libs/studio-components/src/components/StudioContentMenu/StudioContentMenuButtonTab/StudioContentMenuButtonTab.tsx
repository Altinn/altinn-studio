import type { ReactNode } from 'react';
import React from 'react';
import { StudioMenuTab } from '../StudioMenuTab';
import { useStudioContentMenuContext } from '../context/StudioContentMenuContext';
import classes from './StudioContentMenuButtonTab.module.css';
import { moveFocus } from '../utils/dom-utils';

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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    moveFocus(event);
  };

  const isTabSelected = selectedTabId === tabId;

  return (
    <button
      className={classes.buttonTab}
      role='tab'
      tabIndex={0} // isTabSelected ? 0 : -1
      onClick={() => onChangeTab(tabId)}
      onKeyDown={handleKeyDown}
    >
      <StudioMenuTab icon={icon} tabName={tabName} isTabSelected={isTabSelected} />
    </button>
  );
}
