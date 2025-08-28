import { Button } from '@digdir/designsystemet-react';
import type { ButtonProps } from '@digdir/designsystemet-react';
import type { ElementType, ReactNode } from 'react';
import React, { forwardRef } from 'react';
import cn from 'classnames';
import classes from './StudioButton.module.css';
import type { OverridableComponent } from '../../types/OverridableComponent';
import type { IconPlacement } from '../../types/IconPlacement';
import type { OverridableComponentRef } from '../../types/OverridableComponentRef';
import type { OverridableComponentProps } from '../../types/OverridableComponentProps';
import type { Override } from '../../types/Override';

export type StudioButtonProps = Override<
  {
    icon?: ReactNode;
    iconPlacement?: IconPlacement;
    color?: ButtonProps['color'] | 'inverted';
  },
  Omit<ButtonProps, 'asChild'>
>;

/**
 * @deprecated use `StudioButton` from `@studio/components` instead
 */

const StudioButton: OverridableComponent<StudioButtonProps, HTMLButtonElement> = forwardRef(
  <As extends ElementType = 'button'>(
    {
      as,
      children,
      className: givenClassName,
      color,
      fullWidth,
      icon,
      iconPlacement = 'left',
      size = 'small',
      variant,
      ...rest
    }: OverridableComponentProps<StudioButtonProps, As>,
    ref: OverridableComponentRef<As>,
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
      [classes.smallWithIconOnly]: size === 'small' && !children,
    });
    const selectedColor = color === 'inverted' ? undefined : color;

    const Component = as || 'button';

    return (
      <Button
        asChild
        className={classNames}
        color={selectedColor}
        fullWidth={fullWidth}
        icon={!children}
        size={size}
        variant={variant}
      >
        <Component ref={ref} {...rest}>
          {icon ? (
            <span className={classes.innerContainer}>
              {iconPlacement === 'left' && iconComponent}
              {children}
              {iconPlacement === 'right' && iconComponent}
            </span>
          ) : (
            children
          )}
        </Component>
      </Button>
    );
  },
);

StudioButton.displayName = 'StudioButton';

export { StudioButton };
