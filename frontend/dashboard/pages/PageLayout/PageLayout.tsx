import { Outlet } from 'react-router-dom';
import { useOrganizationsQuery } from '../../hooks/queries';
import { useRepoStatusQuery, useUserQuery } from 'app-shared/hooks/queries';
import React, { useMemo } from 'react';
import { HeaderContextProvider, type HeaderContextProps } from '../../context/HeaderContext';
import { useTranslation } from 'react-i18next';
import { StudioPageSpinner } from '@studio/components';
import { useContextRedirectionGuard } from '../../hooks/guards/useContextRedirectionGuard';
import { DashboardHeader } from './DashboardHeader';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { isOrg } from '../../utils/orgUtils';
import { useOrgRepoName } from '../../hooks/useOrgRepoName';

export const PageLayout = () => {
  const { t } = useTranslation();
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();
  const { isRedirectionComplete } = useContextRedirectionGuard(organizations);

  const selectedContext = useSelectedContext();
  const orgRepoName = useOrgRepoName();

  const {
    data: repoStatus,
    isPending: isRepoStatusPending,
    error: repoStatusError,
  } = useRepoStatusQuery(selectedContext, orgRepoName, {
    hideDefaultError: !isOrg(selectedContext),
  });

  const headerContextValue: Partial<HeaderContextProps> = useMemo(
    () => ({
      selectableOrgs: organizations,
      user,
    }),
    [organizations, user],
  );

  const isLoadingData: boolean = !isRedirectionComplete || isRepoStatusPending;

  if (isLoadingData) return <StudioPageSpinner spinnerTitle={t('dashboard.loading')} />;

  return (
    <>
      <HeaderContextProvider
        user={headerContextValue.user}
        selectableOrgs={headerContextValue.selectableOrgs}
      >
        <DashboardHeader
          showSubMenu={!repoStatus?.hasMergeConflict}
          isRepoError={repoStatusError !== null}
        />
      </HeaderContextProvider>
      <Outlet />
    </>
  );
};
