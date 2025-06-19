import React, { type ReactElement } from 'react';
import type { HeaderMenuItem } from '../../../../types/HeaderMenuItem';
import { StringUtils, UrlUtils } from '@studio/pure-functions';
import { useSelectedContext } from '../../../../hooks/useSelectedContext';
import { StudioPageHeader } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import classes from './LargeNavigationMenu.module.css';
import cn from 'classnames';

type LargeNavigationMenuProps = {
  menuItems: HeaderMenuItem[];
};

export const LargeNavigationMenu = ({ menuItems }: LargeNavigationMenuProps): ReactElement => {
  return (
    <ul className={classes.menu}>
      {menuItems.map((menuItem: HeaderMenuItem) => (
        <NavigationMenuItem key={menuItem.name} menuItem={menuItem} />
      ))}
    </ul>
  );
};

type NavigationMenuItemProps = {
  menuItem: HeaderMenuItem;
};

function NavigationMenuItem({ menuItem }: NavigationMenuItemProps): ReactElement {
  const selectedContext: string = useSelectedContext();
  const { t } = useTranslation();
  const location = useLocation();
  const path: string = `${menuItem.link}/${selectedContext}`;
  const currentRoutePath: string = UrlUtils.extractSecondLastRouterParam(location.pathname);

  return (
    <li key={menuItem.name}>
      <StudioPageHeader.HeaderLink
        color='dark'
        variant='regular'
        isBeta={menuItem.isBeta}
        renderLink={(props) => (
          <NavLink to={path} {...props}>
            <span
              className={cn({
                [classes.active]:
                  StringUtils.removeLeadingSlash(menuItem.link) === currentRoutePath,
              })}
            >
              {t(menuItem.name)}
            </span>
          </NavLink>
        )}
      />
    </li>
  );
}
