import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import classes from './StudioButton.module.css';
import cn from 'classnames';
import { Button, type ButtonProps } from '@digdir/designsystemet-react';
import { IconPlacement } from '../../types/IconPlacement';

export type StudioButtonProps = {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
} & Omit<ButtonProps, 'asChild' | 'icon'>;

export const StudioButton = ({
  icon,
  iconPlacement = 'left',
  'data-size': dataSize = 'sm',
  className: givenClassName,
  children,
  ...rest
}: StudioButtonProps): ReactElement => {
  const iconComponent = (
    <span aria-hidden className={classes.iconWrapper}>
      {icon}
    </span>
  );

  const classNames = cn(givenClassName, classes.studioButton, {
    [classes.smallWithIconOnly]: dataSize === 'sm' && !children,
  });

  return (
    <Button className={classNames} icon={!children} data-size={dataSize} {...rest}>
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
};
