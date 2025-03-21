import React, { type ReactNode, type ReactElement, useState } from 'react';
import classes from './StudioPageHeaderProfileMenu.module.css';
import { DropdownMenu, type DropdownMenuItemProps } from '@digdir/designsystemet-react';
import { StudioPageHeaderHeaderButton } from '../StudioPageHeaderHeaderButton';
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

  const toggleMenu = () => {
    setOpen((isOpen) => !isOpen);
  };

  const close = () => {
    setOpen(false);
  };

  return (
    <DropdownMenu onClose={close} open={open} size='sm'>
      <DropdownMenu.Trigger asChild>
        <StudioPageHeaderHeaderButton
          className={classes.triggerButton}
          onClick={toggleMenu}
          color={color}
          variant={variant}
          aria-label={ariaLabelTriggerButton}
          title={triggerButtonText}
        >
          <span className={classes.triggerButtonText}>{triggerButtonText}</span>
          {profileImage}
        </StudioPageHeaderHeaderButton>
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
}: StudioProfileMenuGroupItemProps): ReactElement =>
  item.action.type === 'button' ? (
    <StudioProfileMenuButton
      item={item as StudioProfileMenuItem<'button'>}
      onClickButton={onClickItem}
    />
  ) : (
    <StudioProfileMenuLink item={item as StudioProfileMenuItem<'link'>} />
  );

type StudioProfileMenuButtonProps = {
  item: StudioProfileMenuItem<'button'>;
  onClickButton: () => void;
} & DropdownMenuItemProps;

const StudioProfileMenuButton = ({
  item,
  onClickButton,
  ...rest
}: StudioProfileMenuButtonProps): ReactElement => {
  const handleClick = () => {
    item.action.onClick();
    onClickButton();
  };
  return (
    <DropdownMenu.Item
      className={classes.menuItemButton}
      aria-checked={item.isActive}
      role='menuitemradio'
      onClick={handleClick}
      {...rest}
    >
      {item.itemName}
    </DropdownMenu.Item>
  );
};

type StudioProfileMenuLinkProps = {
  item: StudioProfileMenuItem<'link'>;
};

const StudioProfileMenuLink = ({ item }: StudioProfileMenuLinkProps): ReactElement => {
  const { href, openInNewTab } = item.action;
  return (
    <DropdownMenu.Item asChild>
      <a
        href={href}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
      >
        {item.itemName}
      </a>
    </DropdownMenu.Item>
  );
};
