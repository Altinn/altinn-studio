import React from 'react';
import classes from './Divider.module.css';
import classNames from 'classnames';

interface DividerProps {
  inMenu?: boolean;
  className?: string;
}
export const Divider = ({ inMenu, className }: DividerProps) => (
  <hr
    className={classNames(classes.root, inMenu ? classes.inMenu : classes.standalone, className)}
  />
);
