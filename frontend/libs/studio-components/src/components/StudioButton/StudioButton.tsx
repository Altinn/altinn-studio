import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import classes from './StudioButton.module.css';
import cn from 'classnames';
import { Button, type ButtonProps } from '@digdir/designsystemet-react';
import type { IconPlacement } from '../../types/IconPlacement';
import { TextWithIcon } from '../TextWithIcon';

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
  const classNames = cn(givenClassName, classes.studioButton, {
    [classes.smallWithIconOnly]: dataSize === 'sm' && !children,
  });

  return (
    <Button className={classNames} icon={!children} data-size={dataSize} {...rest}>
      {icon ? (
        <TextWithIcon icon={icon} iconPlacement={iconPlacement}>
          {children}
        </TextWithIcon>
      ) : (
        children
      )}
    </Button>
  );
};
