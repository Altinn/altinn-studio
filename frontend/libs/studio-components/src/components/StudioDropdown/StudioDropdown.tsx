import React, { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Dropdown } from '@digdir/designsystemet-react';
import type { DropdownProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';
import { StudioDropdownContext } from './StudioDropdownContext';
import type { IconPlacement } from '../../types/IconPlacement';
import { IconWithTextComponent } from '../IconWithTextComponent';

export type StudioDropdownProps = {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
  triggerButtonText?: string;
} & Omit<WithoutAsChild<DropdownProps>, 'anchorEl' | 'open' | 'onClose'>;

export const StudioDropdown = ({
  icon,
  iconPlacement = 'left',
  triggerButtonText,
  children,
  'data-size': dataSize = 'sm',
  ...rest
}: StudioDropdownProps): ReactElement => {
  const [open, setOpen] = useState<boolean>(false);

  const handleClick = () => {
    setOpen((oldValue: boolean) => !oldValue);
  };

  return (
    <Dropdown.TriggerContext>
      <Dropdown.Trigger
        data-size={dataSize}
        onClick={handleClick}
        icon={!triggerButtonText}
        aria-expanded={open}
      >
        <IconWithTextComponent icon={icon} iconPlacement={iconPlacement}>
          {triggerButtonText}
        </IconWithTextComponent>
      </Dropdown.Trigger>
      <Dropdown data-size={dataSize} onClose={() => setOpen(false)} open={open} {...rest}>
        <StudioDropdownContext.Provider value={{ setOpen }}>
          {children}
        </StudioDropdownContext.Provider>
      </Dropdown>
    </Dropdown.TriggerContext>
  );
};
