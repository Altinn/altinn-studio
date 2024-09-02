import React, { type ReactNode, type ReactElement, useState } from 'react';
import classes from './StudioProfileMenu.module.css';
import { Divider, DropdownMenu } from '@digdir/designsystemet-react';
import { StudioPageHeaderButton } from '../StudioPageHeader';
import { type StudioPageHeaderColor } from '../StudioPageHeader/types/StudioPageHeaderColor';
import { type StudioPageHeaderVariant } from '../StudioPageHeader/types/StudioPageHeaderVariant';

type StudioProfileMenuItemButton = {
  type: 'button';
  onClick: () => void;
};

type StudioProfileMenuItemLink = {
  type: 'link';
  href: string;
  openInNewTab?: boolean;
};

export type StudioProfileMenuItem = {
  action: StudioProfileMenuItemButton | StudioProfileMenuItemLink;
  itemName: string;
  isActive?: boolean;
  hasDivider?: boolean;
};

export type StudioProfileMenuProps = {
  triggerButtonText?: string;
  profileImage: ReactNode;
  profileMenuItems: StudioProfileMenuItem[];
  color: StudioPageHeaderColor;
  variant: StudioPageHeaderVariant;
  ariaLabelTriggerButton: string;
};

export const StudioProfileMenu = ({
  triggerButtonText,
  profileImage,
  profileMenuItems,
  color,
  variant,
  ariaLabelTriggerButton,
}: StudioProfileMenuProps): ReactElement => {
  const [open, setOpen] = useState(false);

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
      <DropdownMenu.Trigger asChild size='sm'>
        <StudioPageHeaderButton
          onClick={handleToggleMenu}
          color={color}
          variant={variant}
          aria-label={ariaLabelTriggerButton}
        >
          {triggerButtonText && <span className={classes.userOrgNames}>{triggerButtonText}</span>}
          {profileImage}
        </StudioPageHeaderButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {profileMenuItems.map((item: StudioProfileMenuItem) => {
          if (item.action.type === 'button') {
            return (
              <React.Fragment key={item.itemName}>
                <DropdownMenu.Item
                  key={item.itemName}
                  onClick={() => handleClickMenuItemButton(item)}
                  className={item.isActive ? classes.selected : undefined}
                >
                  {item.itemName}
                </DropdownMenu.Item>
                {item.hasDivider && <Divider />}
              </React.Fragment>
            );
          }
          return (
            <React.Fragment key={item.itemName}>
              <DropdownMenu.Item key={item.itemName} asChild>
                <a
                  href={item.action.href}
                  target={item.action.openInNewTab && '_blank'}
                  rel={item.action.openInNewTab && 'noopener noreferrer'}
                >
                  {item.itemName}
                </a>
              </DropdownMenu.Item>
              {item.hasDivider && <Divider />}
            </React.Fragment>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
