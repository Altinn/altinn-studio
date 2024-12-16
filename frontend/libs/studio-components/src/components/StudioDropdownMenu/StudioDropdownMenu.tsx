import React, { useState } from 'react';
import { DropdownMenu } from '@digdir/designsystemet-react';
import type { DropdownMenuProps } from '@digdir/designsystemet-react';
import type { StudioButtonProps } from '../StudioButton';
import { StudioButton } from '../StudioButton';
import { StudioDropdownMenuContext } from './StudioDropdownMenuContext';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export interface StudioDropdownMenuProps
  extends Omit<WithoutAsChild<DropdownMenuProps>, 'anchorEl' | 'open' | 'onClose'> {
  anchorButtonProps?: StudioButtonProps;
}

export const StudioDropdownMenu = ({
  anchorButtonProps,
  children,
  ...rest
}: StudioDropdownMenuProps) => {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <DropdownMenu portal {...rest} onClose={() => setOpen(false)} open={open}>
      <DropdownMenu.Trigger asChild>
        <StudioButton
          aria-expanded={open}
          aria-haspopup='menu'
          size={rest.size}
          onClick={() => setOpen(!open)}
          {...anchorButtonProps}
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <StudioDropdownMenuContext.Provider value={{ setOpen }}>
          {children}
        </StudioDropdownMenuContext.Provider>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
