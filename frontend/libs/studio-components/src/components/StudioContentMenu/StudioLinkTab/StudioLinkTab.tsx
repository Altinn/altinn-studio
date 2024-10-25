import React from 'react';
import type { StudioLinkTabType } from '../types/StudioMenuTabType';
import classes from './StudioLinkTab.module.css';
import { StudioMenuTab } from '../StudioMenuTab';
import { StudioLink } from '@studio/components';
import { StudioMenuTabContainer } from '../StudioMenuTabContainer';
import { useStudioContentMenuContext } from '../context/StudioContentMenuContext';

type StudioLinkTabProps<TabId extends string> = {
  contentTab: StudioLinkTabType<TabId>;
};

export function StudioLinkTab<TabId extends string>({
  contentTab,
}: StudioLinkTabProps<TabId>): React.ReactElement {
  const { selectedTabId, onChangeTab } = useStudioContentMenuContext();

  return (
    <StudioMenuTabContainer
      contentTab={contentTab}
      isTabSelected={selectedTabId === contentTab.tabId}
      onClick={() => onChangeTab(contentTab.tabId)}
    >
      <StudioLink className={classes.linkTab} href={contentTab.to}>
        <div className={classes.linkIcon}>{contentTab.icon}</div>
        <StudioMenuTab contentTab={contentTab} />
      </StudioLink>
    </StudioMenuTabContainer>
  );
}
