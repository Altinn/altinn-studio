import React, { type ReactNode, type ReactElement } from 'react';
import classes from './StudioPageHeaderProfileMenu.module.css';
import { StudioDropdown } from '../../StudioDropdown';
import { type StudioProfileMenuItem } from './types/StudioProfileMenuItem';
import { type StudioProfileMenuGroup } from './types/StudioProfileMenuGroup';

export type StudioPageHeaderProfileMenuProps = {
  triggerButtonText?: string;
  profileImage: ReactNode;
  profileMenuGroups: StudioProfileMenuGroup[];
};

export const StudioPageHeaderProfileMenu = ({
  triggerButtonText,
  profileImage,
  profileMenuGroups,
}: StudioPageHeaderProfileMenuProps): ReactElement => {
  return (
    <StudioDropdown
      triggerButtonVariant='tertiary'
      placement='bottom-end'
      data-color='neutral'
      triggerButtonText={triggerButtonText}
      icon={profileImage}
      iconPlacement='right'
      data-color-scheme='light'
    >
      <StudioPageHeaderMenuContent profileMenuGroups={profileMenuGroups} onClickItem={close} />
    </StudioDropdown>
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
    <StudioDropdown.List>
      {profileMenuGroups.map((group: StudioProfileMenuGroup, index: number) => (
        <StudioPageHeaderMenuContentGroup key={index} group={group} onClickItem={onClickItem} />
      ))}
    </StudioDropdown.List>
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
    <StudioDropdown.Item className={classes.dropDownMenuGroup}>
      {group.items.map((item: StudioProfileMenuItem) => (
        <StudioProfileMenuGroupItem key={item.itemName} item={item} onClickItem={onClickItem} />
      ))}
    </StudioDropdown.Item>
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
};

const StudioProfileMenuButton = ({
  item,
  onClickButton,
}: StudioProfileMenuButtonProps): ReactElement => {
  const handleClick = (): void => {
    item.action.onClick();
    onClickButton();
  };
  return (
    <StudioDropdown.Item>
      <StudioDropdown.Button
        aria-checked={item.isActive}
        role='menuitemradio'
        onClick={handleClick}
      >
        {item.itemName}
      </StudioDropdown.Button>
    </StudioDropdown.Item>
  );
};

type StudioProfileMenuLinkProps = {
  item: StudioProfileMenuItem<'link'>;
};

const StudioProfileMenuLink = ({ item }: StudioProfileMenuLinkProps): ReactElement => {
  const { href, openInNewTab } = item.action;
  return (
    <StudioDropdown.Item>
      <StudioDropdown.Button asChild>
        <a
          href={href}
          target={openInNewTab ? '_blank' : undefined}
          rel={openInNewTab ? 'noopener noreferrer' : undefined}
        >
          {item.itemName}
        </a>
      </StudioDropdown.Button>
    </StudioDropdown.Item>
  );
};
