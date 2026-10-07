import classes from './Navigation.module.css';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import cn from 'classnames';
import { studioBetaTagClasses, StudioHeading } from '@studio/components';
import { useTopBarMenuItems } from 'app-development/hooks/useTopBarMenuItems';
import { HeaderMenuItemKey } from 'app-development/enums/HeaderMenuItemKey';

const menuItemKeysHiddenOnOverviewPage = [HeaderMenuItemKey.About, HeaderMenuItemKey.Deploy];

export const Navigation = () => {
  const { t } = useTranslation();
  const menuItems = useTopBarMenuItems().filter(
    (menuItem) => !menuItemKeysHiddenOnOverviewPage.includes(menuItem.key),
  );

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
