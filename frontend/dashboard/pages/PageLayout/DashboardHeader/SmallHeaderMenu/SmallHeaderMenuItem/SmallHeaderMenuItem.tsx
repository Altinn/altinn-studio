import React, { type ReactElement } from 'react';
import classes from './SmallHeaderMenuItem.module.css';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DropdownMenu } from '@digdir/designsystemet-react';
import type { NavigationMenuItem } from '../../../../../types/NavigationMenuItem';
import { UrlUtils } from '@studio/pure-functions';

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
  const currentRoutePath: string = UrlUtils.extractSecondLastRouterParam(location.pathname);

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
    UrlUtils.extractLastRouterParam(menuItem.action.href) === currentRoutePath
      ? classes.active
      : '';

  const linkTarget: string = menuItem.action.openInNewTab ? '_blank' : '';
  const linkRel: string = menuItem.action.openInNewTab ? 'noopener noreferrer' : '';

  return (
    <DropdownMenu.Item key={menuItem.itemName} asChild className={linkItemClassName}>
      <NavLink to={menuItem.action.href} onClick={onClick} target={linkTarget} rel={linkRel}>
        {t(menuItem.itemName)}
      </NavLink>
    </DropdownMenu.Item>
  );
};
