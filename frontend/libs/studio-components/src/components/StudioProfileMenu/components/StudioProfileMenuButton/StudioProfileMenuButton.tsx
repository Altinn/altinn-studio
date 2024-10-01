import React, { type ReactElement } from 'react';
import { DropdownMenu, type DropdownMenuItemProps } from '@digdir/designsystemet-react';
import classes from './StudioProfileMenuButton.module.css';

export type StudioProfileMenuButtonProps = {
  itemName: string;
  isActive?: boolean;
} & DropdownMenuItemProps;

export const StudioProfileMenuButton = ({
  itemName,
  isActive,
  ...rest
}: StudioProfileMenuButtonProps): ReactElement => {
  return (
    <DropdownMenu.Item key={itemName} className={isActive ? classes.selected : undefined} {...rest}>
      {itemName}
    </DropdownMenu.Item>
  );
};
