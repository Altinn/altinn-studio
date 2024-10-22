import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { StudioParagraph } from '../../StudioParagraph';
import classes from './StudioMenuTab.module.css';
import { moveFocus } from '../utils/dom-utils';

type StudioMenuTabProps<TabId extends string> = {
  icon: ReactNode;
  tabName: string;
  tabId: TabId;
  isTabSelected: boolean;
  onClick: (tabId: TabId) => void;
};

export type MenuTab<TabId extends string> = Omit<
  StudioMenuTabProps<TabId>,
  'isTabSelected' | 'onClick'
>;

export function StudioMenuTab<TabId extends string>({
  icon,
  tabName,
  tabId,
  isTabSelected,
  onClick,
}: StudioMenuTabProps<TabId>): ReactElement {
  const handleKeyDown = (event: React.KeyboardEvent<any>) => {
    moveFocus(event);
    if (event.key === 'Enter') {
      event.preventDefault();
      onClick(tabId);
    }
  };

  return (
    <div
      className={isTabSelected ? classes.tabIsSelected : classes.tab}
      onClick={() => onClick(tabId)}
      role='tab'
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className={classes.icon}>{icon}</div>
      <StudioParagraph size='small' variant='short' className={classes.tabTitle}>
        {tabName}
      </StudioParagraph>
    </div>
  );
}
