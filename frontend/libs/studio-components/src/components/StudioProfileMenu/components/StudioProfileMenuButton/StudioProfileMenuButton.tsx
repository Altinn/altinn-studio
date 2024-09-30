import React, { type ReactElement } from 'react';
import { DropdownMenu } from '@digdir/designsystemet-react';
import classes from './StudioProfileMenuButton.module.css';

export type StudioProfileMenuButtonProps = {
  itemName: string;
  isActive?: boolean;
  onClick: () => void;
};

export const StudioProfileMenuButton = ({
  itemName,
  isActive,
  onClick,
}: StudioProfileMenuButtonProps): ReactElement => {
  return (
    <DropdownMenu.Item
      key={itemName}
      onClick={onClick}
      className={isActive ? classes.selected : undefined}
    >
      {itemName}
    </DropdownMenu.Item>
  );
};
