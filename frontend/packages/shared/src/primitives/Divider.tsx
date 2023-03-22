import React from 'react';
import classes from './Divider.module.css';
import cn from 'classnames';

interface DividerProps {
  marginless?: boolean;
  className?: string;
}

export const Divider = ({ marginless, className }: DividerProps) => (
  <hr
    className={cn(classes.root, marginless ? classes.marginless : classes.standalone, className)}
  />
);
