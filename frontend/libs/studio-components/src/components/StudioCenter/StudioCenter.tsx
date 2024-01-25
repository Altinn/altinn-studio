import type { HTMLAttributes } from 'react';
import React, { forwardRef } from 'react';
import classes from './StudioCenter.module.css';
import cn from 'classnames';

type StudioCenterProps = HTMLAttributes<HTMLDivElement>;

/**
 * @component
 *    Component that centers its content both vertically and horizontally.
 */
export const StudioCenter = forwardRef<HTMLDivElement, StudioCenterProps>(
  ({ className, ...rest }, ref): JSX.Element => (
    <div ref={ref} className={cn(className, classes.root)} {...rest} />
  ),
);

StudioCenter.displayName = 'StudioCenter';
