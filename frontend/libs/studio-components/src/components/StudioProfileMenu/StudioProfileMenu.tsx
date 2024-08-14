import React, { type ReactNode, type ReactElement, useState } from 'react';
import classes from './StudioProfileMenu.module.css';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { PersonCircleIcon } from '@studio/icons';
import { StudioPageHeaderButton } from '../StudioPageHeader';
import { type StudioPageHeaderVariant } from '../StudioPageHeader/types/StudioPageHeaderVariant';
import { type StudioPageHeaderColor } from '../StudioPageHeader/types/StudioPageHeaderColor';

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
  variant: StudioPageHeaderVariant;
};

export const StudioProfileMenu = ({
  triggerButtonText,
  profileImage,
  profileMenuItems,
  variant,
}: StudioProfileMenuProps): ReactElement => {
  const [open, setOpen] = useState(false);

  const buttonColor: StudioPageHeaderColor = variant === 'regular' ? 'dark' : 'light';

  const handleToggleMenu = () => {
    setOpen((isOpen) => !isOpen);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleClickMenuItemButton = (menuItem: StudioProfileMenuItem) => {
    menuItem.action.type === 'button' && menuItem.action.onClick();
    setOpen(false);
  };

  return (
    <DropdownMenu onClose={handleClose} open={open}>
      <DropdownMenu.Trigger asChild>
        <StudioPageHeaderButton variant={variant} color={buttonColor} onClick={handleToggleMenu}>
          {triggerButtonText && <span className={classes.userOrgNames}>{triggerButtonText}</span>}
          {profileImage ? profileImage : <PersonCircleIcon className={classes.avatarIcon} />}
        </StudioPageHeaderButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {profileMenuItems.map((item: StudioProfileMenuItem) => {
          if (item.action.type === 'button') {
            return (
              <DropdownMenu.Item
                key={item.itemName}
                onClick={() => handleClickMenuItemButton(item)}
              >
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
