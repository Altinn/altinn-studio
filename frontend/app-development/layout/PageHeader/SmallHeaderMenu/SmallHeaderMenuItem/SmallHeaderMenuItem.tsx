import React, { type ReactElement } from 'react';
import classes from './SmallHeaderMenuItem.module.css';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DropdownMenu, Tag } from '@digdir/designsystemet-react';
import { getRouterRouteByPathname } from 'app-development/utils/headerMenu/headerMenuUtils';
import { type NavigationMenuSmallItem } from 'app-development/types/HeaderMenu/NavigationMenuSmallItem';

export type SmallHeaderMenuItemProps = {
  menuItem: NavigationMenuSmallItem;
  onClick: () => void;
};

export const SmallHeaderMenuItem = ({
  menuItem,
  onClick,
}: SmallHeaderMenuItemProps): ReactElement => {
  const { t } = useTranslation();

  const location = useLocation();
  const currentRoutePath: string = getRouterRouteByPathname(location.pathname);

  if (menuItem.action.type === 'button') {
    return (
      <DropdownMenu.Item key={menuItem.name} onClick={menuItem.action.onClick}>
        {menuItem.name}
      </DropdownMenu.Item>
    );
  }

  const linkItemClassName: string =
    getRouterRouteByPathname(menuItem.action.href) === currentRoutePath ? classes.active : '';

  return (
    <DropdownMenu.Item key={menuItem.name} asChild className={linkItemClassName}>
      <NavLink
        to={menuItem.action.href}
        onClick={onClick}
        target={menuItem.action.openInNewTab && '_blank'}
        rel={menuItem.action.openInNewTab && 'noopener noreferrer'}
      >
        {t(menuItem.name)}
        {menuItem.isBeta && <Tag color='first'>{t('general.beta')}</Tag>}
      </NavLink>
    </DropdownMenu.Item>
  );
};
