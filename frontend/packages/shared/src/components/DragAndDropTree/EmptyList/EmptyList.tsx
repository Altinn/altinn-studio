import React from 'react';
import { Paragraph } from '@digdir/designsystemet-react';
import classes from './EmptyList.module.css';

export interface EmptyListProps {
  children: string;
}

export const EmptyList = ({ children }: EmptyListProps) => (
  <Paragraph className={classes.root} size='small'>
    {children}
  </Paragraph>
);
