import React, { type ReactElement } from 'react';
import classes from './LargeNavigationMenu.module.css';
import cn from 'classnames';
import { NavLink, useLocation } from 'react-router-dom';
import { StudioBetaTag, StudioPageHeaderButton } from '@studio/components';
import { getRouterRouteByPathname } from 'app-development/utils/headerMenu/headerMenuUtils';
import { type NavigationMenuItem } from 'app-development/types/HeaderMenu/NavigationMenuItem';
import { usePageHeaderContext } from 'app-development/contexts/PageHeaderContext';

export type LargeNavigationMenuProps = {
  menuItems: NavigationMenuItem[];
};

export const LargeNavigationMenu = ({ menuItems }: LargeNavigationMenuProps): ReactElement => {
  const { variant } = usePageHeaderContext();

  const location = useLocation();
  const currentRoutePath: string = getRouterRouteByPathname(location.pathname);

  return (
    <div className={classes.wrapper}>
      <ul className={classes.menu}>
        {menuItems.map((menuItem: NavigationMenuItem) => (
          <li key={menuItem.name}>
            <StudioPageHeaderButton asChild color='dark' variant={variant}>
              <NavLink to={menuItem.link}>
                <span
                  className={cn({
                    [classes.active]: getRouterRouteByPathname(menuItem.link) === currentRoutePath,
                  })}
                >
                  {menuItem.name}
                </span>
                {menuItem.isBeta && <StudioBetaTag className={classes.betaTag} />}
              </NavLink>
            </StudioPageHeaderButton>
          </li>
        ))}
      </ul>
    </div>
  );
};
