import React, { type ReactElement } from 'react';
import cn from 'classnames';
import classes from './StudioAnimateHeight.module.css';
import { useMediaQuery } from '../../hooks/';

export type StudioAnimateHeightProps = {
  open: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

/**
 * AnimateHeight is a component that animates its height when the `open` prop changes.
 */
export const StudioAnimateHeight = ({
  children,
  className: externalClass,
  open,
  ...rest
}: StudioAnimateHeightProps): ReactElement => {
  const shouldAnimate = !useMediaQuery('(prefers-reduced-motion)');

  const animateClass = shouldAnimate && classes.animate;
  const openClass = open && classes.open;
  const containerClass = cn(classes.container, animateClass, openClass, externalClass);

  return (
    <div {...rest} className={containerClass}>
      <div className={classes.inner}>{children}</div>
    </div>
  );
};
