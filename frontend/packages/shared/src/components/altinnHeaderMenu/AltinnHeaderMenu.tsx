import React from 'react';
import classes from './AltinnHeaderMenu.module.css';
import classNames from 'classnames';

export interface IAltinnHeaderMenuProps {
  activeSubHeaderSelection?: string;
  menu: AltinnHeaderMenuItem[];
}

export interface AltinnHeaderMenuItem {
  key: string;
  link: JSX.Element;
}

export const AltinnHeaderMenu = ({ activeSubHeaderSelection, menu }: IAltinnHeaderMenuProps) => {
  if (!menu?.length) return null;

  return (
    <ul className={classes.menu} data-testid='altinn-header-menu'>
      {menu.map((item) => (
        <li
          key={item.key}
          className={classNames(
            classes.menuItem,
            activeSubHeaderSelection === item.key && classes.active
          )}
        >
          {item.link}
        </li>
      ))}
    </ul>
  );
};
