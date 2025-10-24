import React from 'react';
import classes from './PageLayout.module.css';
import { Outlet, matchPath, useLocation, Navigate } from 'react-router-dom';
import { PageHeader } from './PageHeader';
import { useUserQuery } from 'app-shared/hooks/queries';
import { StudioCenter, StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useOrgListQuery } from 'app-shared/hooks/queries/useOrgListQuery';

export const PageLayout = (): React.ReactNode => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const match = matchPath({ path: '/:org', caseSensitive: true, end: false }, pathname);
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
    // TODO: Navigate to 404 page?
    return <Navigate to='/' replace />;
  }

  return (
    <>
      <PageHeader user={user} org={orgs?.[org]} />
      <div className={classes.pageWrapper}>
        <Outlet />
      </div>
    </>
  );
};
