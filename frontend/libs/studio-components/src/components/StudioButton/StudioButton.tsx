import React, { forwardRef } from 'react';
import type { ReactElement, ReactNode, Ref } from 'react';
import classes from './StudioButton.module.css';
import cn from 'classnames';
import { Button, type ButtonProps } from '@digdir/designsystemet-react';
import type { IconPlacement } from '../../types/IconPlacement';
import { TextWithIcon } from '../TextWithIcon';

export type StudioButtonProps = {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
} & Omit<ButtonProps, 'asChild' | 'icon'>;

function StudioButton(
  {
    icon,
    iconPlacement = 'left',
    'data-size': dataSize,
    className: givenClassName,
    children,
    ...rest
  }: StudioButtonProps,
  ref: Ref<HTMLButtonElement>,
): ReactElement {
  const classNames = cn(givenClassName, classes.studioButton, {
    [classes.smallWithIconOnly]: dataSize === 'sm' && !children,
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
}

const ForwardedStudioButton = forwardRef(StudioButton);

export { ForwardedStudioButton as StudioButton };
