import React from 'react';
import type { ReactElement, ReactNode, MouseEvent } from 'react';
import cn from 'classnames';
import classes from './StudioDropdownButton.module.css';
import { Dropdown } from '@digdir/designsystemet-react';
import type { DropdownButtonProps } from '@digdir/designsystemet-react';
import type { IconPlacement } from '../../../types/IconPlacement';
import { useStudioDropdownContext } from '../context/StudioDropdownContext';
import { TextWithIcon } from '../../TextWithIcon';

export type StudioDropdownButtonProps = {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
} & Omit<DropdownButtonProps, 'icon'>;

export function StudioDropdownButton({
  children,
  icon,
  iconPlacement = 'left',
  onClick,
  className,
  ...rest
}: StudioDropdownButtonProps): ReactElement {
  const { setOpen } = useStudioDropdownContext();

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    onClick?.(event);
    setOpen(false);
  };

  return (
    <Dropdown.Button
      className={cn(className, classes.studioDropdownMenuButton)}
      onClick={handleClick}
      icon={!children}
      {...rest}
    >
      <TextWithIcon icon={icon} iconPlacement={iconPlacement}>
        {children}
      </TextWithIcon>
    </Dropdown.Button>
  );
}

StudioDropdownButton.displayName = 'StudioDropdown.Button';
