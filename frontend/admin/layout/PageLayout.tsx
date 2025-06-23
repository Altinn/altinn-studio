import React from 'react';
import { Outlet, matchPath, useLocation } from 'react-router-dom';
import { PageHeader } from './PageHeader';
import { useUserQuery } from 'app-shared/hooks/queries';
import { StudioCenter, StudioPageSpinner } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { useOrgListQuery } from 'app-shared/hooks/queries/useOrgListQuery';

/**
 * Displays the layout for the app development pages
 */
export const PageLayout = (): React.ReactNode => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const match = matchPath({ path: '/:org', caseSensitive: true, end: false }, pathname);
  const { org } = match.params;
  const { data: orgs, isPending: isOrgsPending } = useOrgListQuery();
  const { data: user, isPending: isUserPending } = useUserQuery();

  if (isUserPending || isOrgsPending) {
    return (
      <StudioCenter>
        <StudioPageSpinner spinnerTitle={t('repo_status.loading')} />
      </StudioCenter>
    );
  }

  return (
    <>
      <PageHeader user={user} org={orgs?.[org]} />
      <Outlet />
    </>
  );
};
