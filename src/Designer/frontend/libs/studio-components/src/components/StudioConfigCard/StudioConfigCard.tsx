import React from 'react';
import { StudioCard } from '../StudioCard';
import classes from './StudioConfigCard.module.css';

type StudioConfigCardProps = {
  children: React.ReactNode;
};

export function StudioConfigCard({ children }: StudioConfigCardProps): React.ReactElement {
  return <StudioCard className={classes.wrapper}>{children}</StudioCard>;
}
