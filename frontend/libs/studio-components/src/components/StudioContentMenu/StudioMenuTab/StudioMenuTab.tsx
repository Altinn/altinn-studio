import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { StudioParagraph } from '../../StudioParagraph';
import classes from './StudioMenuTab.module.css';
import { moveFocus } from '../utils/dom-utils';
import { StudioLink } from '@studio/components';

export type StudioMenuTabType<TabId extends string> = {
  icon: ReactNode;
  tabName: string;
  tabId: TabId;
  actAsLink?: {
    to: string;
  };
};

type StudioMenuTabProps<TabId extends string> = {
  contentTab: StudioMenuTabType<TabId>;
  isTabSelected: boolean;
  onClick: (tabId: TabId) => void;
};

export function StudioMenuTab<TabId extends string>({
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
    >
      {contentTab.actAsLink ? (
        <TabAsLink contentTab={contentTab} />
      ) : (
        <MenuTabContent contentTab={contentTab} />
      )}
    </div>
  );
}

type TabAsLinkProps<TabId extends string> = {
  contentTab: StudioMenuTabType<TabId>;
};

function TabAsLink<TabId extends string>({ contentTab }: TabAsLinkProps<TabId>) {
  return (
    <StudioLink className={classes.test} href={contentTab.actAsLink.to}>
      <MenuTabContent contentTab={contentTab} />
    </StudioLink>
  );
}

type MenuTabContentProps<TabId extends string> = TabAsLinkProps<TabId>;

function MenuTabContent<TabId extends string>({ contentTab }: MenuTabContentProps<TabId>) {
  return (
    <>
      <div className={contentTab.actAsLink ? classes.linkIcon : classes.icon}>
        {contentTab.icon}
      </div>
      <StudioParagraph size='small' variant='short' className={classes.tabTitle}>
        {contentTab.tabName}
      </StudioParagraph>
    </>
  );
}
