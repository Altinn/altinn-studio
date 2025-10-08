import React from 'react';
import { StudioParagraph } from '../../StudioParagraph';
import classes from './StudioEmptyList.module.css';

export interface StudioEmptyListProps {
  children: string;
}

export const StudioEmptyList = ({ children }: StudioEmptyListProps): React.ReactElement => (
  <StudioParagraph className={classes.root} data-size='sm'>
    {children}
  </StudioParagraph>
);
