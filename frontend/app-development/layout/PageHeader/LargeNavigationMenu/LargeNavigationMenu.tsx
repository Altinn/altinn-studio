import React, { type ReactElement } from 'react';
import classes from './LargeNavigationMenu.module.css';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StudioPageHeaderButton } from '@studio/components';
import { Tag } from '@digdir/designsystemet-react';
import { getRouterRouteByPathname } from 'app-development/utils/headerMenu/headerMenuUtils';
import { type NavigationMenuItem } from 'app-development/types/HeaderMenu/NavigationMenuItem';

export type LargeNavigationMenuProps = {
  menuItems: NavigationMenuItem[];
};

export const LargeNavigationMenu = ({ menuItems }: LargeNavigationMenuProps): ReactElement => {
  const { t } = useTranslation();
  const location = useLocation();
  const currentRoutePath: string = getRouterRouteByPathname(location.pathname);

  return (
    <div className={classes.wrapper}>
      <ul className={classes.menu}>
        {menuItems.map((menuItem: NavigationMenuItem) => (
          <li key={menuItem.name}>
            <StudioPageHeaderButton asChild color='dark'>
              <NavLink to={menuItem.link}>
                <span
                  className={
                    getRouterRouteByPathname(menuItem.link) === currentRoutePath
                      ? classes.active
                      : undefined
                  }
                >
                  {menuItem.name}
                </span>
                {menuItem.isBeta && (
                  <Tag color='info' size='small' className={classes.betaTag}>
                    {t('general.beta')}
                  </Tag>
                )}
              </NavLink>
            </StudioPageHeaderButton>
          </li>
        ))}
      </ul>
    </div>
  );
};
