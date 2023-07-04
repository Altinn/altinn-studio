import classes from './Center.module.css';
import React, { HTMLAttributes } from 'react';
import cn from 'classnames';

/**
 * Component that centers its content both vertically and horizontally.
 */
export const Center = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) =>
  <div className={cn(className, classes.root)} {...rest}/>;
