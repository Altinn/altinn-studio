import type { PropsWithChildren } from 'react';
import React from 'react';
import classes from './Decorator.module.css';

export type DecoratorProps = PropsWithChildren<{}>;

export function Decorator({ children }: DecoratorProps) {
  return <div className={classes.decorator}>{children}</div>;
}
