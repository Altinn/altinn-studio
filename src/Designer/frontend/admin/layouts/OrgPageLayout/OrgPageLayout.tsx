import React from 'react';
import { Outlet } from 'react-router-dom';
import { useOrganizationsQuery, useUserQuery } from 'app-shared/hooks/queries';
import { StudioCenter, StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { NotFound } from '../../components/NotFound/NotFound';
import { OrgContext } from '../../contexts/OrgContext';
import { StudioPageError } from 'app-shared/components';
import { NoOrgSelected } from 'admin/components/NoOrgSelected/NoOrgSelected';
import { useRequiredRoutePathsParams } from 'admin/hooks/useRequiredRoutePathsParams';
import { WebSocketSyncWrapper } from './WebSocketSyncWrapper';

export const OrgPageLayout = (): React.ReactNode => {
  const { t } = useTranslation();
  const { owner: org } = useRequiredRoutePathsParams(['owner']);
  const { data: user, isPending: isUserPending, isError: isUserError } = useUserQuery();
  const {
    data: organizations,
    isPending: isOrgsPending,
    isError: isOrgsError,
  } = useOrganizationsQuery();

  if (isUserPending || isOrgsPending) {
    return (
      <StudioCenter>
        <StudioPageSpinner spinnerTitle={t('general.loading')} />
      </StudioCenter>
    );
  }

  if (isUserError || isOrgsError) {
    return <StudioPageError />;
  }

  if (user?.login === org) {
    return <NoOrgSelected />;
  }

  const currentOrg = (organizations ?? []).find((o) => o.username === org) ?? null;

  if (!currentOrg) {
    return <NotFound />;
  }

  return (
    <WebSocketSyncWrapper>
      <OrgContext.Provider value={currentOrg}>
        <Outlet />
      </OrgContext.Provider>
    </WebSocketSyncWrapper>
  );
};
