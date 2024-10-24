import React from 'react';
import type { ReactElement } from 'react';
import classes from './StudioMenuTabContainer.module.css';
import { moveFocus } from '../utils/dom-utils';
import type { StudioMenuTabAsLinkType, StudioMenuTabType } from '../types/StudioMenuTabType';
import { StudioMenuTabAsLink } from './StudioMenuTabAsLink';
import { StudioMenuTab } from './StudioMenuTab';

type StudioMenuTabProps<TabId extends string> = {
  contentTab: StudioMenuTabType<TabId>;
  isTabSelected: boolean;
  onClick: (tabId: TabId) => void;
};

export function StudioMenuTabContainer<TabId extends string>({
  contentTab,
  isTabSelected,
  onClick,
}: StudioMenuTabProps<TabId>): ReactElement {
  const handleKeyDown = (event: React.KeyboardEvent<any>) => {
    moveFocus(event);
    if (event.key === 'Enter') {
      event.preventDefault();
      onClick(contentTab.tabId);
    }
  };

  return (
    <div
      className={isTabSelected ? classes.tabIsSelected : classes.tab}
      onClick={() => onClick(contentTab.tabId)}
      role='tab'
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      title={contentTab.tabName}
    >
      {isStudioMenuTabAsLink(contentTab) ? (
        <StudioMenuTabAsLink contentTab={contentTab} />
      ) : (
        <StudioMenuTab contentTab={contentTab} />
      )}
    </div>
  );
}

function isStudioMenuTabAsLink<TabId extends string>(
  contentTab: StudioMenuTabType<TabId>,
): contentTab is StudioMenuTabAsLinkType<TabId> {
  return 'to' in contentTab;
}
