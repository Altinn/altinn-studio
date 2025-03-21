import React from 'react';
import { StudioParagraph } from '../../StudioParagraph';
import classes from './StudioEmptyList.module.css';

export interface StudioEmptyListProps {
  children: string;
}

export const StudioEmptyList = ({ children }: StudioEmptyListProps) => (
  <StudioParagraph className={classes.root} size='small'>
    {children}
  </StudioParagraph>
);
