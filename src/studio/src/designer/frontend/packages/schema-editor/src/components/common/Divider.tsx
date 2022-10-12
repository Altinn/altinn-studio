import React from 'react';
import classes from './Divider.module.css';
import classNames from 'classnames';

interface DividerProps {
  inMenu?: boolean;
}
export const Divider = ({ inMenu }: DividerProps) => (
  <hr className={classNames(classes.root, inMenu ? classes.inMenu : classes.standalone)} />
);
