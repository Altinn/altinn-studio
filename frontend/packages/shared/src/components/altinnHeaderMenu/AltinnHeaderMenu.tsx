import React from 'react';
import classes from './AltinnHeaderMenu.module.css';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export interface IAltinnHeaderMenuProps {
  activeSubHeaderSelection?: string;
  menu: AltinnHeaderMenuItem[];
}

export interface AltinnHeaderMenuItem {
  key: string;
  link: JSX.Element;
}

export const AltinnHeaderMenu = ({ activeSubHeaderSelection, menu }: IAltinnHeaderMenuProps) => {
  const { t } = useTranslation();
  if (window.location.pathname.includes('preview')) {
    return (
      <Link to={''} className={classes.previewLinkElement}>
        {t('general.preview')}
      </Link>
    );
  } else if (!menu?.length) {
    return null;
  } else {
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
  }
};
