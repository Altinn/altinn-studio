import React from 'react';
import classes from './Navigation.module.css';
import { useTranslation } from 'react-i18next';
import { getFilteredMenuListForOverviewPage } from 'app-development/utils/headerMenu/headerMenuUtils';
import { Link } from 'react-router-dom';
import cn from 'classnames';
import { studioBetaTagClasses, StudioHeading } from '@studio/components';
import { useFeatureFlagsContext } from '@studio/feature-flags';

export const Navigation = () => {
  const { t } = useTranslation();
  const { flags } = useFeatureFlagsContext();

  const menuItems = getFilteredMenuListForOverviewPage(flags);

  return (
    <div className={classes.navigation}>
      <StudioHeading level={2} data-size='xs'>
        {t('overview.navigation_title')}
      </StudioHeading>
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
