import React from 'react';
import { StudioCard } from '../StudioCard';
import classes from './StudioConfigCard.module.css';
import cn from 'classnames';

export type StudioConfigCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function StudioConfigCard({
  children,
  className,
}: StudioConfigCardProps): React.ReactElement {
  return <StudioCard className={cn(classes.wrapper, className)}>{children}</StudioCard>;
}
