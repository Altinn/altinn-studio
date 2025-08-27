import React, { type HTMLAttributes, type ReactElement } from 'react';
import classes from './ItemWrapper.module.css';

type ItemWrapperProps = HTMLAttributes<HTMLDivElement>;

export const ItemWrapper = ({ children }: ItemWrapperProps): ReactElement => (
  <div className={classes.itemWrapper}>{children}</div>
);
