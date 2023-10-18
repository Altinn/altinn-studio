import React from 'react';
import classes from './Navigation.module.css';
import { useTranslation } from 'react-i18next';
import { Heading } from '@digdir/design-system-react';

import { TopBarMenu, menu } from 'app-development/layout/AppBar/appBarConfig';
import { Link, useParams } from 'react-router-dom';

export const Navigation = () => {
  const { t } = useTranslation();
  const { org, app } = useParams();

  const links = menu.filter((item) => item.key !== TopBarMenu.About);

  return (
    <div className={classes.navigation}>
      <Heading level={2} size='xxsmall'>
        {t('administration.navigation_title')}
      </Heading>
      <div className={classes.links}>
        {links.map((link) => {
          return (
            <Link
              key={link.key}
              to={link.link.replace(':org', org).replace(':app', app)}
              className={classes.link}
            >
              <link.icon className={classes.icon} />
              <span>{t(link.key)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
