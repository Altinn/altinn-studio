import React from 'react';
import { StudioCard } from '../StudioCard';
import type { StudioCardProps } from '../StudioCard';
import classes from './StudioConfigCard.module.css';
import cn from 'classnames';

export type StudioConfigCardProps = StudioCardProps & {
  children: React.ReactNode;
};

export function StudioConfigCard({
  children,
  className,
  ...rest
}: StudioConfigCardProps): React.ReactElement {
  return (
    <StudioCard className={cn(classes.wrapper, className)} {...rest}>
      {children}
    </StudioCard>
  );
}
