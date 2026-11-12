import React from 'react';
import { StudioParagraph } from '../../StudioParagraph';
import classes from './StudioEmptyList.module.css';

export interface StudioEmptyListProps {
  children?: string;
}

export const StudioEmptyList = ({ children }: StudioEmptyListProps): React.ReactElement | null => {
  if (!children) return null;

  return <StudioParagraph className={classes.root}>{children}</StudioParagraph>;
};
