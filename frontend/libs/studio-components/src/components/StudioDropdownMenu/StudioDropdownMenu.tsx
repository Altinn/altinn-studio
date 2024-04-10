import React, { useRef, useState } from 'react';
import { DropdownMenu } from '@digdir/design-system-react';
import type { DropdownMenuProps } from '@digdir/design-system-react';
import { StudioDropdownMenuContext } from './StudioDropdownMenuContext';
import type { StudioButtonProps } from '../StudioButton';

export interface StudioDropdownMenuProps extends Omit<DropdownMenuProps, 'anchorEl' | 'onClose'> {
  anchorButtonProps?: StudioButtonProps;
}

export const StudioDropdownMenu = ({
  anchorButtonProps,
  children,
  open: isControlledOpen,
  ...rest
}: StudioDropdownMenuProps) => {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState<boolean>(isControlledOpen || false);

  return (
    <>
      <DropdownMenu open={open} onClose={() => setOpen(false)}>
        <DropdownMenu.Trigger
          aria-expanded={open}
          aria-haspopup='menu'
          ref={anchorRef}
          size={rest.size}
          onClick={() => setOpen(!open)}
          {...anchorButtonProps}
        >
          {anchorButtonProps.icon} {anchorButtonProps.children}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <StudioDropdownMenuContext.Provider value={{ setOpen }}>
            {children}
          </StudioDropdownMenuContext.Provider>
        </DropdownMenu.Content>
      </DropdownMenu>
    </>
  );
};
