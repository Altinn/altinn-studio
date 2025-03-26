import React, { useContext } from 'react';
import type { ReactElement, ReactNode, MouseEvent } from 'react';
import cn from 'classnames';
import classes from './StudioDropdownButton.module.css';
import { Dropdown } from '@digdir/designsystemet-react';
import type { DropdownButtonProps } from '@digdir/designsystemet-react';
import type { IconPlacement } from '../../types/IconPlacement';
import { StudioDropdownContext } from './StudioDropdownContext';
import { IconWithTextComponent } from '../IconWithTextComponent';

export type StudioDropdownButtonProps = {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
} & Omit<DropdownButtonProps, 'icon'>;

export const StudioDropdownButton = ({
  children,
  icon,
  iconPlacement = 'left',
  onClick,
  className,
  ...rest
}: StudioDropdownButtonProps): ReactElement => {
  const { setOpen } = useContext(StudioDropdownContext);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick(event);
    setOpen(false);
  };

  return (
    <Dropdown.Button
      className={cn(className, classes.studioDropdownMenuButton)}
      onClick={handleClick}
      icon={!children}
      {...rest}
    >
      <IconWithTextComponent icon={icon} iconPlacement={iconPlacement}>
        {children}
      </IconWithTextComponent>
    </Dropdown.Button>
  );
};

StudioDropdownButton.displayName = 'StudioDropdown.Button';
