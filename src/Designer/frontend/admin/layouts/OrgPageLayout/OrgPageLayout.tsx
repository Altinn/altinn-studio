import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useOrganizationsQuery, useUserQuery } from 'app-shared/hooks/queries';
import { StudioCenter, StudioPageError, StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { NotFoundPage } from '../../pages/NotFoundPage/NotFoundPage';
import { OrgContext } from '../../contexts/OrgContext';

export const OrgPageLayout = (): React.ReactNode => {
  const { t } = useTranslation();
  const { org: orgParam } = useParams<{ org: string }>();
  const { data: organizations, isPending: isOrgsPending } = useOrganizationsQuery();
  const { data: user, isPending: isUserPending } = useUserQuery();

  if (isUserPending || isOrgsPending) {
    return (
      <StudioCenter>
        <StudioPageSpinner spinnerTitle={t('repo_status.loading')} />
      </StudioCenter>
    );
  }

  if (!user) {
    return <StudioPageError />;
  }

  const currentOrg = (organizations ?? []).find((o) => o.username === orgParam) ?? null;

  if (!currentOrg) {
    return <NotFoundPage />;
  }

  return (
    <OrgContext.Provider value={currentOrg}>
      <Outlet />
    </OrgContext.Provider>
  );
};
