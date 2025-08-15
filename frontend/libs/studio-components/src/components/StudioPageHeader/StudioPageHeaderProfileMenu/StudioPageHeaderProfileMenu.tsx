import React, { type ReactNode, type ReactElement, useState } from 'react';
import classes from './StudioPageHeaderProfileMenu.module.css';
import commonClasses from '../common.module.css';
import cn from 'classnames';
import { Dropdown, type DropdownItemProps } from '@digdir/designsystemet-react';
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

  const toggleMenu = (): void => {
    setOpen((isOpen) => !isOpen);
  };

  const close = (): void => {
    setOpen(false);
  };

  return (
    <Dropdown.TriggerContext>
      <Dropdown.Trigger
        variant='tertiary'
        className={cn(commonClasses.linkOrButton, commonClasses[variant], commonClasses[color])}
        onClick={toggleMenu}
        aria-label={ariaLabelTriggerButton}
        title={triggerButtonText}
      >
        <span className={classes.triggerButtonText}>{triggerButtonText}</span>
        {profileImage}
      </Dropdown.Trigger>
      <Dropdown open={open} onClose={close} className={classes.dropDownMenuGroup}>
        <StudioPageHeaderMenuContent profileMenuGroups={profileMenuGroups} onClickItem={close} />
      </Dropdown>
    </Dropdown.TriggerContext>
  );
};

type StudioPageHeaderMenuContentProps = {
  profileMenuGroups: StudioProfileMenuGroup[];
  onClickItem: () => void;
};
const StudioPageHeaderMenuContent = ({
  profileMenuGroups,
  onClickItem,
}: StudioPageHeaderMenuContentProps): ReactElement[] => {
  return profileMenuGroups.map((group: StudioProfileMenuGroup, index: number) => (
    <StudioPageHeaderMenuContentGroup key={index} group={group} onClickItem={onClickItem} />
  ));
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
    <Dropdown.List>
      {group.items.map((item: StudioProfileMenuItem) => (
        <StudioProfileMenuGroupItem key={item.itemName} item={item} onClickItem={onClickItem} />
      ))}
    </Dropdown.List>
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
} & DropdownItemProps;

const StudioProfileMenuButton = ({
  item,
  onClickButton,
  ...rest
}: StudioProfileMenuButtonProps): ReactElement => {
  const handleClick = (): void => {
    item.action.onClick();
    onClickButton();
  };
  return (
    <Dropdown.Item {...rest}>
      <Dropdown.Button
        role='menuitemradio'
        onClick={handleClick}
        aria-checked={item.isActive}
        className={classes.menuItemButton}
      >
        {item.itemName}
      </Dropdown.Button>
    </Dropdown.Item>
  );
};

type StudioProfileMenuLinkProps = {
  item: StudioProfileMenuItem<'link'>;
};

const StudioProfileMenuLink = ({ item }: StudioProfileMenuLinkProps): ReactElement => {
  const { href, openInNewTab } = item.action;
  return (
    <Dropdown.Item>
      <Dropdown.Button asChild>
        <a
          href={href}
          target={openInNewTab ? '_blank' : undefined}
          rel={openInNewTab ? 'noopener noreferrer' : undefined}
        >
          {item.itemName}
        </a>
      </Dropdown.Button>
    </Dropdown.Item>
  );
};
