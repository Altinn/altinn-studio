export { Divider } from './Divider';
import React, { ReactNode } from 'react';
import classes from './Primitives.module.css';

interface Props {
  children: ReactNode;
}

export const SimpleContainer = ({ children }: Props) => {
  return <div className={classes.simpleContainer}>{children}</div>;
};
