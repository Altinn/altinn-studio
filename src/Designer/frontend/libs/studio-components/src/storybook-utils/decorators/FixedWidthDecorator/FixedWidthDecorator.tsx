import type { PropsWithChildren, ReactElement } from 'react';
import React from 'react';
import classes from './FixedWidthDecorator.module.css';

export type FixedWidthDecoratorProps = PropsWithChildren<{}>;

export function FixedWidthDecorator({ children }: FixedWidthDecoratorProps): ReactElement {
  return <div className={classes.decorator}>{children}</div>;
}
