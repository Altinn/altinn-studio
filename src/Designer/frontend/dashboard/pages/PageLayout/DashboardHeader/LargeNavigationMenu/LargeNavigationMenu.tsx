import React, { type ReactElement } from 'react';
import type { HeaderMenuItem } from '../../../../types/HeaderMenuItem';
import { useSelectedContext } from '../../../../hooks/useSelectedContext';
import { StudioPageHeader } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import classes from './LargeNavigationMenu.module.css';
import cn from 'classnames';
import { useSubroute } from '../../../../hooks/useSubRoute';

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
  const subroute = useSubroute();
  const { t } = useTranslation();
  const path: string = `/${menuItem.link}/${selectedContext}`;

  return (
    <li key={menuItem.name}>
      <StudioPageHeader.HeaderLink
        isBeta={menuItem.isBeta}
        renderLink={(props) => (
          <NavLink to={path} {...props}>
            <span
              className={cn({
                [classes.active]: menuItem.link === subroute,
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
