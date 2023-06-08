import React from 'react';
import classes from './AppPreviewMenu.module.css';
import classNames from 'classnames';

export interface IAppPreviewMenuProps {
  activeSubHeaderSelection?: string;
  menu: AppPreviewMenuItem[];
}

export interface AppPreviewMenuItem {
  key: string;
  link: JSX.Element;
}

export const AppPreviewMenu = ({ activeSubHeaderSelection, menu }: IAppPreviewMenuProps) => {
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
