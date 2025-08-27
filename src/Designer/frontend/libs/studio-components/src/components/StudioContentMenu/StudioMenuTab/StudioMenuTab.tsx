import classes from './StudioMenuTab.module.css';
import { StudioParagraph } from '../../../index';
import type { ReactNode, ReactElement } from 'react';
import React from 'react';

type StudioMenuTabProps = {
  icon: ReactNode;
  tabName: string;
};

export function StudioMenuTab({ icon, tabName }: StudioMenuTabProps): ReactElement {
  return (
    <>
      <div className={classes.tabIcon}>{icon}</div>
      <StudioParagraph variant='short' className={classes.tabTitle}>
        {tabName}
      </StudioParagraph>
    </>
  );
}
