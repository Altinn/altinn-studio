import classes from './StudioMenuTab.module.css';
import { StudioParagraph } from '@studio/components-legacy';
import type { ReactNode } from 'react';
import React from 'react';

type StudioMenuTabProps = {
  icon: ReactNode;
  tabName: string;
};

export function StudioMenuTab({ icon, tabName }: StudioMenuTabProps) {
  return (
    <>
      <div className={classes.tabIcon}>{icon}</div>
      <StudioParagraph size='small' variant='short' className={classes.tabTitle}>
        {tabName}
      </StudioParagraph>
    </>
  );
}
