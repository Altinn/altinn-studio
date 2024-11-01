import React, { PropsWithChildren, ReactElement } from 'react';
import classes from './ValueWithIcon.module.css';
import { IconPlacement } from '../../../types/IconPlacement';

export type ValueWithIconProps = PropsWithChildren<{
  icon?: ReactElement;
  iconPlacement?: IconPlacement;
}>;

export function ValueWithIcon({ icon, iconPlacement = 'left', children }: ValueWithIconProps) {
  if (!icon) return children;

  return (
    <span className={classes.container}>
      {iconPlacement === 'left' && <Icon icon={icon} />}
      {children}
      {iconPlacement === 'right' && <Icon icon={icon} />}
    </span>
  );
}

function Icon({ icon }: Pick<ValueWithIconProps, 'icon'>) {
  return (
    <span aria-hidden className={classes.iconWrapper}>
      {icon}
    </span>
  );
}
