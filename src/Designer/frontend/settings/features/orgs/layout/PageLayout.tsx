import classes from './PageLayout.module.css';
import { matchPath, Outlet, useLocation } from 'react-router-dom';
import { Menu } from '../components/Menu/Menu';
import { useOrgListQuery } from 'app-shared/hooks/queries/useOrgListQuery';
import { useUserQuery } from 'app-shared/hooks/queries';
import {
  StudioCenter,
  StudioHeading,
  StudioPageError,
  StudioPageSpinner,
} from '@studio/components';
import { NotFound } from '../../../pages/NotFound/NotFound';
import { useTranslation } from 'react-i18next';

export const PageLayout = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const match = matchPath({ path: 'orgs/:org', caseSensitive: true, end: false }, pathname);
  const { org } = match?.params ?? {};
  const { data: orgs, isPending: isOrgsPending } = useOrgListQuery();
  const { data: user, isPending: isUserPending } = useUserQuery();

  if (isUserPending || isOrgsPending) {
    return (
      <StudioCenter>
        <StudioPageSpinner spinnerTitle={t('repo_status.loading')} />
      </StudioCenter>
    );
  }

  if (!org || !orgs?.[org]) {
    return <NotFound />;
  }

  if (!user) {
    return <StudioPageError />;
  }

  return (
    <>
      <StudioHeading level={2} className={classes.settingsHeading}>
        {t('settings.orgs.heading')}
      </StudioHeading>
      <div className={classes.settingsHeadingDescription}>
        {t('settings.orgs.heading.description')}
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
