import classes from './StudioMenuTab.module.css';
import { StudioParagraph } from '@studio/components';
import React from 'react';
import type { StudioMenuTabType } from '../types/StudioMenuTabType';

type MenuTabContentProps<TabId extends string> = {
  contentTab: StudioMenuTabType<TabId>;
};

export function StudioMenuTab<TabId extends string>({ contentTab }: MenuTabContentProps<TabId>) {
  return (
    <StudioParagraph size='small' variant='short' className={classes.tabTitle}>
      {contentTab.tabName}
    </StudioParagraph>
  );
}
