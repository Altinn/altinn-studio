import { getTopBarMenu } from 'app-development/layout/AppBar/appBarConfig';
import { getRepositoryType } from 'app-shared/utils/repository';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import classes from './AltinnHeaderMenu.module.css';
import classNames from 'classnames';

export interface IAltinnHeaderMenuProps {
  activeSubHeaderSelection?: string;
}

export const AltinnHeaderMenu = ({ activeSubHeaderSelection }: IAltinnHeaderMenuProps) => {
  const { t } = useTranslation();
  const { org, app } = useParams();
  const repositoryType = getRepositoryType(org, app);
  const menu = getTopBarMenu(repositoryType);

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
          <Link to={item.link.replace(':org', org).replace(':app', app)} data-testid={item.key}>
            {t(item.key)}{' '}
          </Link>
        </li>
      ))}
    </ul>
  );
};
