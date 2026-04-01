import classes from './PageLayout.module.css';
import { Outlet } from 'react-router-dom';
import { Menu } from '../components/Menu/Menu';
import { useUserQuery } from 'app-shared/hooks/queries';
import {
  StudioCenter,
  StudioHeading,
  StudioPageError,
  StudioPageSpinner,
} from '@studio/components';
import { useTranslation } from 'react-i18next';

export const PageLayout = () => {
  const { t } = useTranslation();
  const { data: user, isPending: isUserPending } = useUserQuery();

  if (isUserPending) {
    return (
      <StudioCenter>
        <StudioPageSpinner spinnerTitle={t('repo_status.loading')} />
      </StudioCenter>
    );
  }

  if (!user) {
    return <StudioPageError />;
  }

  return (
    <>
      <StudioHeading level={2} className={classes.settingsHeading}>
        {t('settings.user.heading')}
      </StudioHeading>
      <div className={classes.settingsHeadingDescription}>
        {t('settings.user.heading.description')}
      </div>
      <div className={classes.pageContentWrapper}>
        <div className={classes.leftNavWrapper}>
          <Menu />
        </div>
        <div className={classes.contentWrapper}>
          <Outlet />
        </div>
      </div>
    </>
  );
};
