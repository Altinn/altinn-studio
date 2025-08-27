import type { ReactElement } from 'react';
import React from 'react';
import classes from './TabPageHeader.module.css';
import { StudioHeading } from 'libs/studio-components/src';

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
