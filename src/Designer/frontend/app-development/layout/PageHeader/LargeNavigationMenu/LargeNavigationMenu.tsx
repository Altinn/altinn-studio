import type { ReactElement } from 'react';
import classes from './LargeNavigationMenu.module.css';
import cn from 'classnames';
import { NavLink, useLocation } from 'react-router-dom';
import { StudioPageHeader } from '@studio/components';
import { type NavigationMenuItem } from 'app-development/types/HeaderMenu/NavigationMenuItem';

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
  const location = useLocation();
  const isActive: boolean = location.pathname.includes(menuItem.link);
  return (
    <li key={menuItem.name}>
      <StudioPageHeader.HeaderLink
        isBeta={menuItem.isBeta}
        renderLink={(props) => (
          <NavLink data-color='neutral' to={menuItem.link} {...props}>
            <span
              className={cn({
                [classes.active]: isActive,
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
