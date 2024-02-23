import { Button, type ButtonProps } from '@digdir/design-system-react';
import React, { forwardRef, type ReactNode } from 'react';
import cn from 'classnames';
import classes from './StudioButton.module.css';
import type { OverridableComponent } from '../../types/OverridableComponent';
import type { IconPlacement } from '../../types/IconPlacement';

export type StudioButtonProps = {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
} & Omit<ButtonProps, 'icon'>;

const StudioButton: OverridableComponent<StudioButtonProps, HTMLButtonElement> = forwardRef<
  HTMLButtonElement,
  StudioButtonProps
>(({ icon, iconPlacement = 'left', children, className, ...rest }, ref) => {
  const iconComponent = (
    <span aria-hidden className={classes.iconWrapper}>
      {icon}
    </span>
  );
  return (
    <Button {...rest} className={cn(className, classes.studioButton)} icon={!children} ref={ref}>
      {icon && iconPlacement === 'left' && iconComponent}
      {children}
      {icon && iconPlacement === 'right' && iconComponent}
    </Button>
  );
});

StudioButton.displayName = 'StudioButton';

export { StudioButton };
