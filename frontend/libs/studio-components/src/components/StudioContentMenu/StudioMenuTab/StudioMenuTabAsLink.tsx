import React from 'react';
import classes from './StudioMenuTabContainer.module.css';
import { StudioLink, StudioParagraph } from '@studio/components';
import type { StudioMenuTabAsLinkType } from '../types/StudioMenuTabType';

export type StudioMenuTabAsLinkProps<TabId extends string> = {
  contentTab: StudioMenuTabAsLinkType<TabId>;
};

export function StudioMenuTabAsLink<TabId extends string>({
  contentTab,
}: StudioMenuTabAsLinkProps<TabId>): React.ReactElement {
  return (
    <StudioLink href={contentTab.to}>
      <div className={classes.linkIcon}>{contentTab.icon}</div>
      <StudioParagraph size='small' variant='short' className={classes.tabTitle}>
        {contentTab.tabName}
      </StudioParagraph>
    </StudioLink>
  );
}
