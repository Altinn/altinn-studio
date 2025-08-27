import React from 'react';
import classes from './Navigation.module.css';
import { useTranslation } from 'react-i18next';
import { Heading } from '@digdir/designsystemet-react';
import { getFilteredMenuListForOverviewPage } from '../../../../utils/headerMenu/headerMenuUtils';
import { Link } from 'react-router-dom';
import cn from 'classnames';
import { studioBetaTagClasses } from 'libs/studio-components-legacy/src';

export const Navigation = () => {
  const { t } = useTranslation();

  const menuItems = getFilteredMenuListForOverviewPage();

  return (
    <div className={classes.navigation}>
      <Heading level={2} size='xxsmall'>
        {t('overview.navigation_title')}
      </Heading>
      <div className={classes.links}>
        {menuItems.map((menuItem) => {
          return (
            <Link
              key={menuItem.key}
              to={`../${menuItem.link}`}
              className={cn(classes.link, menuItem.isBeta && studioBetaTagClasses.isBeta)}
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
