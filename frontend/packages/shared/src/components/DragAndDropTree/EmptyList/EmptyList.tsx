import React from 'react';
import { Paragraph } from '@digdir/design-system-react';
import classes from './EmptyItem.module.css';

interface EmptyItemProps {
  children: string;
}

export const EmptyList = ({ children }: EmptyItemProps) => (
  <Paragraph className={classes.root} size='small'>
    {children}
  </Paragraph>
);
