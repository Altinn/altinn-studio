import React, { type ReactNode, type ReactElement, useState } from 'react';
import classes from './StudioProfileMenu.module.css';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { StudioPageHeaderButton } from '../StudioPageHeader';
import { type StudioPageHeaderColor } from '../StudioPageHeader/types/StudioPageHeaderColor';
import { type StudioPageHeaderVariant } from '../StudioPageHeader/types/StudioPageHeaderVariant';
import { type StudioProfileMenuItem } from './types/StudioProfileMenuItem';
import { type StudioProfileMenuGroup } from './types/StudioProfileMenuGroup';
import { StudioProfileMenuButton } from './components/StudioProfileMenuButton';
import { StudioProfileMenuLink } from './components/StudioProfileMenuLink';

export type StudioProfileMenuProps = {
  triggerButtonText?: string;
  profileImage: ReactNode;
  profileMenuGroups: StudioProfileMenuGroup[];
  color: StudioPageHeaderColor;
  variant: StudioPageHeaderVariant;
  ariaLabelTriggerButton: string;
};

export const StudioProfileMenu = ({
  triggerButtonText,
  profileImage,
  profileMenuGroups,
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
          className={classes.triggerButton}
          onClick={handleToggleMenu}
          color={color}
          variant={variant}
          aria-label={ariaLabelTriggerButton}
          title={triggerButtonText}
        >
          <span className={classes.triggerButtonText}>
            {'William Thorenfeldt for Etveldiglangtorgnavnsomerlangt'}
          </span>
          {profileImage}
        </StudioPageHeaderButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {profileMenuGroups.map((group: StudioProfileMenuGroup, index: number) => (
          <DropdownMenu.Group key={index} className={classes.dropDownMenuGroup}>
            {group.items.map((item: StudioProfileMenuItem) => {
              if (item.action.type === 'button') {
                return (
                  <StudioProfileMenuButton
                    key={item.itemName}
                    itemName={item.itemName}
                    isActive={item.isActive}
                    onClick={() => handleClickMenuItemButton(item)}
                    role='menuitemradio'
                  />
                );
              }
              return (
                <StudioProfileMenuLink
                  key={item.itemName}
                  itemName={item.itemName}
                  href={item.action.href}
                  openInNewTab={item.action.openInNewTab}
                />
              );
            })}
          </DropdownMenu.Group>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
