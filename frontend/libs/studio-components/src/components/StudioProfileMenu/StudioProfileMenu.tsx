import React, { type ReactNode, type ReactElement, useState } from 'react';
import classes from './StudioProfileMenu.module.css';
import { StudioButton } from '../StudioButton';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { PersonCircleIcon } from '@studio/icons';

export interface StudioProfileMenuItemButton {
  type: 'button';
  onClick: () => void;
}

export interface StudioProfileMenuItemLink {
  type: 'link';
  href: string;
}

export interface StudioProfileMenuItem {
  action: StudioProfileMenuItemButton | StudioProfileMenuItemLink;
  itemName: string;
  isActive?: boolean;
}

export type StudioProfileMenuProps = {
  triggerButtonText?: string;
  profileImage?: ReactNode;
  profileMenuItems: StudioProfileMenuItem[];
};

export const StudioProfileMenu = ({
  triggerButtonText,
  profileImage,
  profileMenuItems,
}: StudioProfileMenuProps): ReactElement => {
  const [open, setOpen] = useState(false);

  const handleToggleMenu = () => {
    setOpen((isOpen) => !isOpen);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <DropdownMenu onClose={handleClose} open={open}>
      <DropdownMenu.Trigger asChild>
        <StudioButton variant='tertiary' color='inverted' onClick={handleToggleMenu}>
          {triggerButtonText && <span className={classes.userOrgNames}>{triggerButtonText}</span>}
          {profileImage ? profileImage : <PersonCircleIcon className={classes.avatarIcon} />}
        </StudioButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {profileMenuItems.map((item: StudioProfileMenuItem) => {
          if (item.action.type === 'button') {
            return (
              <DropdownMenu.Item key={item.itemName} onClick={item.action.onClick}>
                {item.itemName}
              </DropdownMenu.Item>
            );
          }
          return (
            <DropdownMenu.Item key={item.itemName} asChild>
              <a href={item.action.href} target='_blank' rel='noopener noreferrer'>
                {item.itemName}
              </a>
            </DropdownMenu.Item>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
