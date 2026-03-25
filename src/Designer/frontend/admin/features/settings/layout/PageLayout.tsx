import classes from './PageLayout.module.css';
import { Outlet } from 'react-router-dom';
import { Menu } from '../components/Menu/Menu';
import { useOrgListQuery } from 'app-shared/hooks/queries/useOrgListQuery';
import { useUserQuery } from 'app-shared/hooks/queries';
import {
  StudioCenter,
  StudioHeading,
  StudioPageError,
  StudioPageSpinner,
} from '@studio/components';
import { NotFoundPage } from 'admin/layout/NotFoundPage';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const PageLayout = () => {
  const { t } = useTranslation();
  const { org } = useStudioEnvironmentParams();
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
    return <NotFoundPage />;
  }

  if (!user) {
    return <StudioPageError />;
  }

  return (
    <>
      <StudioHeading level={2} className={classes.settingsHeading}>
        {t('org.settings.heading')}
      </StudioHeading>
      <div className={classes.settingsHeadingDescription}>
        {t('org.settings.heading.description')}
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
