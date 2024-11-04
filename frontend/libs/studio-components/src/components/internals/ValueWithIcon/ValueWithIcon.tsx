import type { PropsWithChildren, ReactNode } from 'react';
import React, { forwardRef } from 'react';

import classes from './ValueWithIcon.module.css';
import type { IconPlacement } from '../../../types/IconPlacement';

export type ValueWithIconProps = PropsWithChildren<{
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
}>;

export const ValueWithIcon = forwardRef<HTMLSpanElement, ValueWithIconProps>(
  ({ icon, iconPlacement = 'left', children }, ref) => {
    if (!icon) return children;

    return (
      <span className={classes.container} ref={ref}>
        {iconPlacement === 'left' && <Icon icon={icon} />}
        {children}
        {iconPlacement === 'right' && <Icon icon={icon} />}
      </span>
    );
  },
);

ValueWithIcon.displayName = 'ValueWithIcon';

function Icon({ icon }: Pick<ValueWithIconProps, 'icon'>) {
  return (
    <span aria-hidden className={classes.iconWrapper}>
      {icon}
    </span>
  );
}
