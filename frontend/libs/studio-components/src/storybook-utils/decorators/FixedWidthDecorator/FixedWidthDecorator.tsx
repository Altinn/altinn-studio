import type { PropsWithChildren } from 'react';
import React from 'react';
import classes from './FixedWidthDecorator.module.css';

export type FixedWidthDecoratorProps = PropsWithChildren<{}>;

export function FixedWidthDecorator({ children }: FixedWidthDecoratorProps) {
  return <div className={classes.decorator}>{children}</div>;
}
