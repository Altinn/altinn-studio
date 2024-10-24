import classes from './StudioMenuTabContainer.module.css';
import { StudioParagraph } from '@studio/components';
import React from 'react';
import type { StudioMenuTabAsButtonType } from '../types/StudioMenuTabType';

type MenuTabContentProps<TabId extends string> = {
  contentTab: StudioMenuTabAsButtonType<TabId>;
};

export function StudioMenuTab<TabId extends string>({ contentTab }: MenuTabContentProps<TabId>) {
  return (
    <>
      <div className={classes.icon}>{contentTab.icon}</div>
      <StudioParagraph size='small' variant='short' className={classes.tabTitle}>
        {contentTab.tabName}
      </StudioParagraph>
    </>
  );
}
