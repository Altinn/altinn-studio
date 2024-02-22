export { Divider } from './Divider';
import React, { type ReactNode } from 'react';
import classes from './Primitives.module.css';
import classnames from 'classnames';

type Props = {
  children: ReactNode;
  className?: string;
};

export const SimpleContainer = ({ children, className }: Props) => {
  return <div className={classnames(classes.simpleContainer, className)}>{children}</div>;
};

export const ButtonContainer = ({ children, className }: Props) => {
  return <div className={classnames(classes.buttonContainer, className)}>{children}</div>;
};
