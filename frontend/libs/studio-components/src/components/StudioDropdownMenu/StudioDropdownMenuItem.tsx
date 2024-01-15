import React, { forwardRef, ReactNode, useContext, MouseEvent } from 'react';
import { DropdownMenu } from '@digdir/design-system-react';
import type { ButtonProps } from '@digdir/design-system-react';
import { IconPlacement } from '../../types/IconPlacement';
import { OverridableComponent } from '../../types/OverridableComponent';
import cn from 'classnames';
import classes from './StudioDropdownMenuItem.module.css';
import { StudioDropdownMenuContext } from './StudioDropdownMenuContext';

type DropdownMenuItemProps = Omit<ButtonProps, 'variant' | 'size' | 'color' | 'fullWidth'>; // TODO: Remove when the correct type is exported from the design system: https://github.com/digdir/designsystemet/pull/1410

export interface StudioDropdownMenuItemProps extends DropdownMenuItemProps {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
}

const StudioDropdownMenuItem: OverridableComponent<
  StudioDropdownMenuItemProps,
  HTMLButtonElement
> = forwardRef<HTMLButtonElement, StudioDropdownMenuItemProps>(
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
