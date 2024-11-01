import { Button } from '@digdir/designsystemet-react';
import type { ButtonProps } from '@digdir/designsystemet-react';
import React, { forwardRef } from 'react';
import cn from 'classnames';
import classes from './StudioButton.module.css';
import type { OverridableComponent } from '../../types/OverridableComponent';
import { ValueWithIcon, ValueWithIconProps } from '../internals/ValueWithIcon';

export type StudioButtonProps = Omit<ButtonProps, 'icon' | 'color'> & {
  color?: ButtonProps['color'] | 'inverted';
} & ValueWithIconProps;

const StudioButton: OverridableComponent<StudioButtonProps, HTMLButtonElement> = forwardRef<
  HTMLButtonElement,
  StudioButtonProps
>(
  (
    { icon, iconPlacement, size = 'small', children, className: givenClassName, color, ...rest },
    ref,
  ) => {
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
        <ValueWithIcon {...{ icon, iconPlacement, children }} />
      </Button>
    );
  },
);

StudioButton.displayName = 'StudioButton';

export { StudioButton };
