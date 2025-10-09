import React, { type ReactNode, type ReactElement } from 'react';
import classes from './StudioPageHeaderRight.module.css';

export type StudioPageHeaderRightProps = {
  children: ReactNode;
};

export const StudioPageHeaderRight = ({ children }: StudioPageHeaderRightProps): ReactElement => {
  return <div className={classes.wrapper}>{children}</div>;
};
