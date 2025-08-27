import type { ReactElement } from 'react';
import React from 'react';
import classes from './TabPageHeader.module.css';
import { StudioHeading } from '@studio/components';

export type TabPageHeaderProps = {
  text: string;
};

export function TabPageHeader({ text }: TabPageHeaderProps): ReactElement {
  return (
    <StudioHeading level={3} className={classes.heading}>
      {text}
    </StudioHeading>
  );
}
