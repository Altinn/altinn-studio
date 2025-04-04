import React, { type ReactElement } from 'react';
import classes from './LargeNavigationMenu.module.css';
import cn from 'classnames';
import { NavLink, useLocation } from 'react-router-dom';
import { StudioPageHeader } from '@studio/components-legacy';
import { UrlUtils } from '@studio/pure-functions';
import { type NavigationMenuItem } from 'app-development/types/HeaderMenu/NavigationMenuItem';
import { usePageHeaderContext } from 'app-development/contexts/PageHeaderContext';

export type LargeNavigationMenuProps = {
  menuItems: NavigationMenuItem[];
};

export const LargeNavigationMenu = ({ menuItems }: LargeNavigationMenuProps): ReactElement => {
  return (
    <div className={classes.wrapper}>
      <ul className={classes.menu}>
        {menuItems.map((menuItem: NavigationMenuItem) => (
          <HeaderButtonListItem key={menuItem.name} menuItem={menuItem} />
        ))}
      </ul>
    </div>
  );
};

type HeaderButtonListItemProps = {
  menuItem: NavigationMenuItem;
};
const HeaderButtonListItem = ({ menuItem }: HeaderButtonListItemProps): ReactElement => {
  const { variant } = usePageHeaderContext();
  const location = useLocation();
  const currentRoutePath: string = UrlUtils.extractLastRouterParam(location.pathname);

  return (
    <li key={menuItem.name}>
      <StudioPageHeader.HeaderLink
        color='dark'
        variant={variant}
        isBeta={menuItem.isBeta}
        renderLink={(props) => (
          <NavLink to={menuItem.link} {...props}>
            <span
              className={cn({
                [classes.active]:
                  UrlUtils.extractLastRouterParam(menuItem.link) === currentRoutePath,
              })}
            >
              {menuItem.name}
            </span>
          </NavLink>
        )}
      />
    </li>
  );
};
