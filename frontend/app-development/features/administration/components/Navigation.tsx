import React from 'react';
import classes from './Navigation.module.css';
import { useTranslation } from 'react-i18next';
import { Heading } from '@digdir/design-system-react';

import { topBarMenuItem } from 'app-development/layout/AppBar/appBarConfig';
import { Link } from 'react-router-dom';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';

export const Navigation = () => {
  const { t } = useTranslation();

  const menuItems = topBarMenuItem.filter((item) => item.key !== TopBarMenu.About);

  return (
    <div className={classes.navigation}>
      <Heading level={2} size='xxsmall'>
        {t('administration.navigation_title')}
      </Heading>
      <div className={classes.links}>
        {menuItems.map((menuItem) => {
          return (
            <Link
              key={menuItem.key}
              to={`../${menuItem.link}`}
              className={classes.link}
              title={t(menuItem.key)}
            >
              <menuItem.icon className={classes.icon} />
              <span>{t(menuItem.key)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
