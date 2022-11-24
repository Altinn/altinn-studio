export { Divider } from './Divider';
import React, { ReactNode } from 'react';
import classes from './Primitives.module.css';
import classnames from 'classnames';

interface Props {
  children: ReactNode;
  className?: string;
}

export const SimpleContainer = ({ children, className }: Props) => {
  return (
    <div className={classnames(classes.simpleContainer, className)}>
      {children}
    </div>
  );
};
