import type { PropsWithChildren, ReactElement } from 'react';
import React from 'react';
import classes from './Decorator.module.css';

export type DecoratorProps = PropsWithChildren<{}>;

export function Decorator({ children }: DecoratorProps): ReactElement {
  return <div className={classes.decorator}>{children}</div>;
}
