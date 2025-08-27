import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { IconPlacement } from '../../types/IconPlacement';
import classes from './TextWithIcon.module.css';

export type TextWithIconProps = {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
  children: ReactNode;
};

export function TextWithIcon({
  icon,
  iconPlacement = 'left',
  children,
}: TextWithIconProps): ReactElement {
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
