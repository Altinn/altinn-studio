import React from 'react';
import { StudioCard } from '../../StudioCard';
import classes from './StudioConfigCardBody.module.css';

type StudioConfigCardBodyProps = {
  children: React.ReactNode;
};

export function StudioConfigCardBody({ children }: StudioConfigCardBodyProps): React.ReactElement {
  return <StudioCard.Block className={classes.cardBody}>{children}</StudioCard.Block>;
}
