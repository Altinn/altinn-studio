import { Button } from '@digdir/designsystemet-react';
import type { ButtonProps } from '@digdir/designsystemet-react';
import type { ReactNode } from 'react';
import React, { forwardRef } from 'react';
import cn from 'classnames';
import classes from './StudioButton.module.css';
import type { OverridableComponent } from '../../types/OverridableComponent';
import type { IconPlacement } from '../../types/IconPlacement';

export type StudioButtonProps = Omit<ButtonProps, 'icon' | 'color'> & {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
  color?: ButtonProps['color'] | 'inverted';
};

const StudioButton: OverridableComponent<StudioButtonProps, HTMLButtonElement> = forwardRef<
  HTMLButtonElement,
  StudioButtonProps
>(
  (
    {
      icon,
      iconPlacement = 'left',
      size = 'small',
      children,
      className: givenClassName,
      color,
      ...rest
    },
    ref,
  ) => {
    const iconComponent = (
      <span aria-hidden className={classes.iconWrapper}>
        {icon}
      </span>
    );

    // This is a temporary mapping to still support the old inverted prop. This will be removed when migrating to V1.
    // Information can be found here: https://www.designsystemet.no/bloggen/2024/v1rc1#fargemodus
    const classNames = cn(givenClassName, classes.studioButton, {
      [classes.inverted]: color === 'inverted',
      [classes.small]: size === 'small',
    });
    const selectedColor = color === 'inverted' ? undefined : color;

    return (
      <Button
        {...rest}
        color={selectedColor}
        className={classNames}
        icon={!children}
        size={size}
        ref={ref}
      >
        {icon ? (
          <span className={classes.innerContainer}>
            {iconPlacement === 'left' && iconComponent}
            {children}
            {iconPlacement === 'right' && iconComponent}
          </span>
        ) : (
          children
        )}
      </Button>
    );
  },
);

StudioButton.displayName = 'StudioButton';

export { StudioButton };
