import React, { type ReactElement } from 'react';
import classes from './SmallHeaderMenuItem.module.css';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DropdownMenu } from '@digdir/designsystemet-react';
import type { NavigationMenuItem } from '../../../../../types/NavigationMenuItem';

export type SmallHeaderMenuItemProps = {
  menuItem: NavigationMenuItem;
  onClick: () => void;
};

export const SmallHeaderMenuItem = ({
  menuItem,
  onClick,
}: SmallHeaderMenuItemProps): ReactElement => {
  const { t } = useTranslation();
  const origin = window.location.origin;

  if (menuItem.action.type === 'button') {
    const handleClick = () => {
      onClick();
      menuItem.action.type === 'button' && menuItem.action.onClick();
    };

    const buttonItemClassName: string = menuItem.isActive ? classes.active : '';

    return (
      <DropdownMenu.Item
        key={menuItem.itemName}
        onClick={handleClick}
        className={buttonItemClassName}
      >
        {menuItem.itemName}
      </DropdownMenu.Item>
    );
  }

  const linkTarget: string = menuItem.action.openInNewTab ? '_blank' : '';
  const linkRel: string = menuItem.action.openInNewTab ? 'noopener noreferrer' : '';

  return (
    <DropdownMenu.Item key={menuItem.itemName} asChild>
      <NavLink
        to={`${origin}${menuItem.action.href}`}
        onClick={onClick}
        target={linkTarget}
        rel={linkRel}
      >
        {t(menuItem.itemName)}
      </NavLink>
    </DropdownMenu.Item>
  );
};
