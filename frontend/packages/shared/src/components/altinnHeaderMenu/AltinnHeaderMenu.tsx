import React from 'react';
import classes from './AltinnHeaderMenu.module.css';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TopBarMenuItem } from 'app-shared/types/TopBarMenuItem';

export interface IAltinnHeaderMenuProps {
  menuItems: TopBarMenuItem[];
}

export const AltinnHeaderMenu = ({ menuItems }: IAltinnHeaderMenuProps) => {
  const { t } = useTranslation();

  if (!menuItems?.length) return null;

  return (
    <ul className={classes.menu}>
      {menuItems.map((item) => (
        <li key={item.key} className={classes.menuItem}>
          <NavLink to={item.link} className={({ isActive }) => (isActive ? classes.active : '')}>
            {t(item.key)}
          </NavLink>
        </li>
      ))}
    </ul>
  );
};
