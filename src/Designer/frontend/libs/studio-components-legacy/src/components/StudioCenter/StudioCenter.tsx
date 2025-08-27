import type { HTMLAttributes } from 'react';
import React, { forwardRef } from 'react';
import classes from './StudioCenter.module.css';
import cn from 'classnames';

type StudioCenterProps = HTMLAttributes<HTMLDivElement>;

/**
 * @deprecated use `StudioCenter` from `@studio/components` instead
 */
export const StudioCenter = forwardRef<HTMLDivElement, StudioCenterProps>(
  ({ className, ...rest }, ref): JSX.Element => (
    <div ref={ref} className={cn(className, classes.root)} {...rest} />
  ),
);

StudioCenter.displayName = 'StudioCenter';
