import React, { forwardRef, useContext, type ReactNode, type MouseEvent } from 'react';
import { DropdownMenu, type DropdownMenuItemProps } from '@digdir/design-system-react';
import type { IconPlacement } from '../../types/IconPlacement';
import type { OverridableComponent } from '../../types/OverridableComponent';
import cn from 'classnames';
import classes from './StudioDropdownMenuItem.module.css';
import { StudioDropdownMenuContext } from './StudioDropdownMenuContext';

export type StudioDropdownMenuItemProps = {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
} & Omit<DropdownMenuItemProps, 'icon'>;

const StudioDropdownMenuItem: OverridableComponent<StudioDropdownMenuItemProps, HTMLButtonElement> =
  forwardRef<HTMLButtonElement, StudioDropdownMenuItemProps>(
    ({ children, icon, iconPlacement = 'left', className, onClick, ...rest }, ref) => {
      const { setOpen } = useContext(StudioDropdownMenuContext);

      const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        onClick(event);
        setOpen(false);
      };

      const iconComponent = (
        <span aria-hidden className={classes.iconWrapper}>
          {icon}
        </span>
      );

      return (
        <DropdownMenu.Item
          className={cn(className, classes.studioDropdownMenuItem)}
          onClick={handleClick}
          {...rest}
          ref={ref}
          icon={!children}
        >
          {icon && iconPlacement === 'left' && iconComponent}
          {children}
          {icon && iconPlacement === 'right' && iconComponent}
        </DropdownMenu.Item>
      );
    },
  );

StudioDropdownMenuItem.displayName = 'StudioDropdownMenu.Item';

export { StudioDropdownMenuItem };
