import React, { HTMLAttributes, forwardRef } from 'react';
import classes from './StudioCenter.module.css';
import cn from 'classnames';

/**
 * @component
 *    Component that centers its content both vertically and horizontally.
 */
export const StudioCenter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref): JSX.Element => (
    <div ref={ref} className={cn(className, classes.root)} {...rest} />
  ),
);

StudioCenter.displayName = 'StudioCenter';
