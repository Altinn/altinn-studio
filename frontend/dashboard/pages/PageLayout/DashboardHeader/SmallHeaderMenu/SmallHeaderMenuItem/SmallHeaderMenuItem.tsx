import React, { type ReactElement } from 'react';
import classes from './SmallHeaderMenuItem.module.css';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DropdownMenu } from '@digdir/designsystemet-react';
import type { NavigationMenuItem } from '../../../../../types/NavigationMenuItem';
import {
  extractLastRouterParam,
  extractSecondLastRouterParam,
} from '../../../../../utils/urlUtils';

export type SmallHeaderMenuItemProps = {
  menuItem: NavigationMenuItem;
  onClick: () => void;
};

export const SmallHeaderMenuItem = ({
  menuItem,
  onClick,
}: SmallHeaderMenuItemProps): ReactElement => {
  const { t } = useTranslation();
  const location = useLocation();
  const currentRoutePath: string = extractSecondLastRouterParam(location.pathname);

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

  const linkItemClassName: string =
    extractLastRouterParam(menuItem.action.href) === currentRoutePath ? classes.active : '';

  return (
    <DropdownMenu.Item key={menuItem.itemName} asChild className={linkItemClassName}>
      <NavLink
        to={menuItem.action.href}
        onClick={onClick}
        target={menuItem.action.openInNewTab ? '_blank' : ''}
        rel={menuItem.action.openInNewTab ? 'noopener noreferrer' : ''}
      >
        {t(menuItem.itemName)}
      </NavLink>
    </DropdownMenu.Item>
  );
};
