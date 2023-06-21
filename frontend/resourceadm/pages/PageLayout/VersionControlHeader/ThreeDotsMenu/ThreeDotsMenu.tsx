import React from 'react';
import classes from './ThreeDotsMenu.module.css';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { repositoryPath } from 'app-shared/api/paths';
import { GiteaIcon } from 'app-shared/icons';
import { Popover } from '@digdir/design-system-react';

export const ThreeDotsMenu = () => {
  const { selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;

  const { t } = useTranslation();

  return (
    <Popover
      className={classes.popover}
      trigger={
        <button data-testid='menuBtn' className={classes.verticalDotsMenu}>
          &#8942;
        </button>
      }
    >
      <ul className={classes.menuItems}>
        <li>
          <a href={repositoryPath(selectedContext, repo)} className={classes.link}>
            <span className={classes.iconWrapper}>
              <GiteaIcon className={classes.icon + ' ' + classes.giteaIcon} />
            </span>
            <span>{t('dashboard.repository')}</span>
          </a>
        </li>
      </ul>
    </Popover>
  );
};
