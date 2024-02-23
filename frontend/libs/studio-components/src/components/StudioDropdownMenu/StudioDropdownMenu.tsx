import React, { useRef, useState } from 'react';
import { DropdownMenu, type DropdownMenuProps } from '@digdir/design-system-react';
import { StudioButton, type StudioButtonProps } from '../StudioButton';
import { StudioDropdownMenuContext } from './StudioDropdownMenuContext';

export interface StudioDropdownMenuProps
  extends Omit<DropdownMenuProps, 'anchorEl' | 'open' | 'onClose'> {
  anchorButtonProps?: StudioButtonProps;
}

export const StudioDropdownMenu = ({
  anchorButtonProps,
  children,
  ...rest
}: StudioDropdownMenuProps) => {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState<boolean>(false);
  return (
    <>
      <StudioButton
        aria-expanded={open}
        aria-haspopup='menu'
        ref={anchorRef}
        size={rest.size}
        onClick={() => setOpen(!open)}
        {...anchorButtonProps}
      />
      <DropdownMenu
        portal
        {...rest}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        open={open}
      >
        <DropdownMenu.Content>
          <StudioDropdownMenuContext.Provider value={{ setOpen }}>
            {children}
          </StudioDropdownMenuContext.Provider>
        </DropdownMenu.Content>
      </DropdownMenu>
    </>
  );
};
