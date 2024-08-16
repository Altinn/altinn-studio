import React from 'react';
import classes from './Navigation.module.css';
import { useTranslation } from 'react-i18next';
import { Heading, Tag } from '@digdir/designsystemet-react';
import { getFilteredTopBarMenu } from 'app-development/utils/headerMenu/headerMenuUtils';
import { Link } from 'react-router-dom';
import { HeaderMenuItemKey } from 'app-development/enums/HeaderMenuItemKey';
import { RepositoryType } from 'app-shared/types/global';

export const Navigation = () => {
  const { t } = useTranslation();

  const menuItems = getFilteredTopBarMenu(RepositoryType.App).filter(
    (item) => item.key !== HeaderMenuItemKey.About && item.key !== HeaderMenuItemKey.Deploy,
  );

  return (
    <div className={classes.navigation}>
      <Heading level={2} size='xxsmall'>
        {t('overview.navigation_title')}
      </Heading>
      <div className={classes.links}>
        {menuItems.map((menuItem) => {
          return (
            <Link key={menuItem.key} to={`../${menuItem.link}`} className={classes.link}>
              <menuItem.icon className={classes.icon} />
              <span>{t(menuItem.key)}</span>
              {menuItem.isBeta && (
                <Tag color='info' size='small'>
                  {t('general.beta')}
                </Tag>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
