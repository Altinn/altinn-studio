import React from 'react';
import classes from './AltinnHeaderMenu.module.css';
import classNames from 'classnames';
import { RoutePaths } from 'app-development/enums/RoutePaths';

export interface IAltinnHeaderMenuProps {
  activeSubHeaderSelection?: string;
  menu: AltinnHeaderMenuItem[];
}

export interface AltinnHeaderMenuItem {
  key: string;
  link: JSX.Element;
  path: RoutePaths;
}

export const AltinnHeaderMenu = ({ activeSubHeaderSelection, menu }: IAltinnHeaderMenuProps) => {
  if (!menu?.length) return null;

  return (
    <ul className={classes.menu}>
      {menu.map((item) => (
        <li
          key={item.key}
          className={classNames(
            classes.menuItem,
            activeSubHeaderSelection === item.path && classes.active,
          )}
        >
          {item.link}
        </li>
      ))}
    </ul>
  );
};
