import classes from './StudioMenuTab.module.css';
import { StudioParagraph } from '@studio/components';
import type { ReactNode } from 'react';
import React from 'react';

type StudioMenuTabProps = {
  icon: ReactNode;
  tabName: string;
  isTabSelected: boolean;
};

export function StudioMenuTab({ icon, tabName, isTabSelected }: StudioMenuTabProps) {
  return (
    <div className={isTabSelected ? classes.selectedTab : classes.tab} title={tabName}>
      <div className={classes.tabIcon}>{icon}</div>
      <StudioParagraph size='small' variant='short' className={classes.tabTitle}>
        {tabName}
      </StudioParagraph>
    </div>
  );
}
