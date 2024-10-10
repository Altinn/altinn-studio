import type { ReactNode } from 'react';
import React from 'react';
import classes from './TabHeader.module.css';
import { Heading } from '@digdir/designsystemet-react';

export type TabHeaderProps = {
  text: string;
};

export const TabHeader = ({ text }: TabHeaderProps): ReactNode => (
  <Heading level={3} spacing size='xsmall' className={classes.heading}>
    {text}
  </Heading>
);
