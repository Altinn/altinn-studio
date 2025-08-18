import React, { forwardRef } from 'react';
import type { ElementType, ReactElement, ReactNode } from 'react';
import classes from './StudioButton.module.css';
import cn from 'classnames';
import { Button, type ButtonProps } from '@digdir/designsystemet-react';
import type { IconPlacement } from '../../types/IconPlacement';
import { TextWithIcon } from '../TextWithIcon';
import type { Override } from '../../types/Override';
import type { OverridableComponentProps } from '../../types/OverridableComponentProps';
import type { OverridableComponentRef } from '../../types/OverridableComponentRef';
import type { OverridableComponent } from '../../types/OverridableComponent';

export type StudioButtonProps = Override<
  {
    fullWidth?: boolean;
    icon?: ReactNode;
    iconPlacement?: IconPlacement;
  },
  Omit<ButtonProps, 'asChild' | 'icon'>
>;

const StudioButton: OverridableComponent<StudioButtonProps, HTMLButtonElement> = forwardRef(
  <As extends ElementType = 'button'>(
    {
      as,
      fullWidth,
      icon,
      iconPlacement = 'left',
      'data-size': dataSize,
      className: givenClassName,
      children,
      ...rest
    }: OverridableComponentProps<StudioButtonProps, As>,
    ref: OverridableComponentRef<As>,
  ): ReactElement => {
    const classNames = cn(givenClassName, classes.studioButton, {
      [classes.smallWithIconOnly]: dataSize === 'sm' && !children,
      [classes.fullWidth]: fullWidth,
    });

    const Component = as || 'button';

    return (
      <Button asChild className={classNames} icon={!children} data-size={dataSize}>
        <Component ref={ref} {...rest}>
          {icon ? (
            <TextWithIcon icon={icon} iconPlacement={iconPlacement}>
              {children}
            </TextWithIcon>
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
