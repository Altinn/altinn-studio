import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { IconPlacement } from '../../types/IconPlacement';
import classes from './IconWithTextComponent.module.css';

export type IconWithTextComponentProps = {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
  children: ReactNode;
};

export function IconWithTextComponent({
  icon,
  iconPlacement = 'left',
  children,
}: IconWithTextComponentProps): ReactElement {
  const iconComponent = (
    <span aria-hidden className={classes.iconWrapper}>
      {icon}
    </span>
  );

  return (
    <span className={classes.wrapper}>
      {iconPlacement === 'left' && iconComponent}
      {children}
      {iconPlacement === 'right' && iconComponent}
    </span>
  );
}
