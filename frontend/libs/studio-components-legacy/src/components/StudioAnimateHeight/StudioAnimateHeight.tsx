import React, { type ReactElement } from 'react';
import cn from 'classnames';
import classes from './StudioAnimateHeight.module.css';

export type StudioAnimateHeightProps = {
  open: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

/**
 * @deprecated Use `StudioAnimateHeight` from `studio-components` instead.
 */
export const StudioAnimateHeight = ({
  children,
  className: externalClass,
  open,
  ...rest
}: StudioAnimateHeightProps): ReactElement => {
  const openClass = open && classes.open;

  return (
    <div {...rest} className={cn(classes.root, openClass, externalClass)}>
      <div className={classes.content}>{children}</div>
    </div>
  );
};
