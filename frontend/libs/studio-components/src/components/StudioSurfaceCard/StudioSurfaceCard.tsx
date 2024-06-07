import React, { forwardRef } from 'react';

import classes from './StudioSurfaceCard.module.css';

type StudioSurfaceCardProps = {
  title: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;
export const StudioSurfaceCard = forwardRef<HTMLDivElement, StudioSurfaceCardProps>(
  (
    { title, children, className: givenClassName }: StudioSurfaceCardProps,
    ref,
  ): React.ReactElement => {
    return (
      <div className={givenClassName}>
        <div className={classes.header}>{title}</div>
        <div>{children}</div>
      </div>
    );
  },
);
