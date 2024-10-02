import React, { type ReactNode, type ReactElement, useState } from 'react';
import classes from './StudioPageHeaderProfileMenu.module.css';
import { DropdownMenu, type DropdownMenuItemProps } from '@digdir/designsystemet-react';
import { StudioPageHeaderButton } from '../StudioPageHeaderButton';
import { type StudioPageHeaderColor } from '../types/StudioPageHeaderColor';
import { type StudioPageHeaderVariant } from '../types/StudioPageHeaderVariant';
import { type StudioProfileMenuItem } from './types/StudioProfileMenuItem';
import { type StudioProfileMenuGroup } from './types/StudioProfileMenuGroup';

export type StudioPageHeaderProfileMenuProps = {
  triggerButtonText?: string;
  profileImage: ReactNode;
  profileMenuGroups: StudioProfileMenuGroup[];
  color: StudioPageHeaderColor;
  variant: StudioPageHeaderVariant;
  ariaLabelTriggerButton: string;
};

export const StudioPageHeaderProfileMenu = ({
  triggerButtonText,
  profileImage,
  profileMenuGroups,
  color,
  variant,
  ariaLabelTriggerButton,
}: StudioPageHeaderProfileMenuProps): ReactElement => {
  const [open, setOpen] = useState(false);

  const handleToggleMenu = () => {
    setOpen((isOpen) => !isOpen);
  };

  const close = () => {
    setOpen(false);
  };

  return (
    <DropdownMenu onClose={close} open={open}>
      <DropdownMenu.Trigger asChild size='sm'>
        <StudioPageHeaderButton
          className={classes.triggerButton}
          onClick={handleToggleMenu}
          color={color}
          variant={variant}
          aria-label={ariaLabelTriggerButton}
          title={triggerButtonText}
        >
          <span className={classes.triggerButtonText}>{triggerButtonText}</span>
          {profileImage}
        </StudioPageHeaderButton>
      </DropdownMenu.Trigger>
      <StudioPageHeaderMenuContent profileMenuGroups={profileMenuGroups} onClickItem={close} />
    </DropdownMenu>
  );
};

type StudioPageHeaderMenuContentProps = {
  profileMenuGroups: StudioProfileMenuGroup[];
  onClickItem: () => void;
};
const StudioPageHeaderMenuContent = ({
  profileMenuGroups,
  onClickItem,
}: StudioPageHeaderMenuContentProps): ReactElement => {
  return (
    <DropdownMenu.Content>
      {profileMenuGroups.map((group: StudioProfileMenuGroup, index: number) => (
        <StudioPageHeaderMenuContentGroup key={index} group={group} onClickItem={onClickItem} />
      ))}
    </DropdownMenu.Content>
  );
};

type StudioPageHeaderMenuContentGroupProps = {
  group: StudioProfileMenuGroup;
  onClickItem: () => void;
};
const StudioPageHeaderMenuContentGroup = ({
  group,
  onClickItem,
}: StudioPageHeaderMenuContentGroupProps): ReactElement => {
  return (
    <DropdownMenu.Group className={classes.dropDownMenuGroup}>
      {group.items.map((item: StudioProfileMenuItem) => (
        <StudioProfileMenuGroupItem key={item.itemName} item={item} onClickItem={onClickItem} />
      ))}
    </DropdownMenu.Group>
  );
};

type StudioProfileMenuGroupItemProps = {
  item: StudioProfileMenuItem;
  onClickItem: () => void;
};
const StudioProfileMenuGroupItem = ({
  item,
  onClickItem,
}: StudioProfileMenuGroupItemProps): ReactElement => {
  const handleClickMenuItemButton = (menuItem: StudioProfileMenuItem) => {
    menuItem.action.type === 'button' && menuItem.action.onClick();
    onClickItem();
  };

  if (item.action.type === 'button') {
    return (
      <StudioProfileMenuButton
        key={item.itemName}
        itemName={item.itemName}
        isActive={item.isActive}
        onClick={() => handleClickMenuItemButton(item)}
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
};

type StudioProfileMenuButtonProps = {
  itemName: string;
  isActive?: boolean;
} & DropdownMenuItemProps;

const StudioProfileMenuButton = ({
  itemName,
  isActive,
  ...rest
}: StudioProfileMenuButtonProps): ReactElement => {
  return (
    <DropdownMenu.Item
      key={itemName}
      className={classes.menuItemButton}
      aria-checked={isActive}
      role='menuitemradio'
      {...rest}
    >
      {itemName}
    </DropdownMenu.Item>
  );
};

type StudioProfileMenuLinkProps = {
  itemName: string;
  href: string;
  openInNewTab?: boolean;
};

const StudioProfileMenuLink = ({
  itemName,
  href,
  openInNewTab,
}: StudioProfileMenuLinkProps): ReactElement => {
  return (
    <DropdownMenu.Item key={itemName} asChild>
      <a
        href={href}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
      >
        {itemName}
      </a>
    </DropdownMenu.Item>
  );
};
