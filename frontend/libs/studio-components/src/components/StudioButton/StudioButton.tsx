import React, { forwardRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import classes from './StudioButton.module.css';
import cn from 'classnames';
import { Button, type ButtonProps } from '@digdir/designsystemet-react';
import type { IconPlacement } from '../../types/IconPlacement';
import { TextWithIcon } from '../TextWithIcon';

export type StudioButtonProps = {
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
} & Omit<ButtonProps, 'asChild' | 'icon'>;

export const StudioButton = forwardRef<HTMLButtonElement, StudioButtonProps>(
  (
    {
      fullWidth,
      icon,
      iconPlacement = 'left',
      'data-size': dataSize,
      className: givenClassName,
      children,
      ...rest
    },
    ref,
  ): ReactElement => {
    const classNames = cn(givenClassName, classes.studioButton, {
      [classes.smallWithIconOnly]: dataSize === 'sm' && !children,
      [classes.fullWidth]: fullWidth,
    });

    return (
      <Button className={classNames} icon={!children} data-size={dataSize} {...rest} ref={ref}>
        {icon ? (
          <TextWithIcon icon={icon} iconPlacement={iconPlacement}>
            {children}
          </TextWithIcon>
        ) : (
          children
        )}
      </Button>
    );
  },
);

StudioButton.displayName = 'StudioButton';
