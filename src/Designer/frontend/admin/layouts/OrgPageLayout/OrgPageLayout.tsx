import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useOrganizationsQuery } from 'app-shared/hooks/queries';
import { StudioCenter, StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { NotFoundPage } from '../../pages/NotFoundPage/NotFoundPage';
import { OrgContext } from '../../contexts/OrgContext';
import { StudioPageError } from 'app-shared/components';

export const OrgPageLayout = (): React.ReactNode => {
  const { t } = useTranslation();
  const { org: orgParam } = useParams<{ org: string }>();
  const {
    data: organizations,
    isPending: isOrgsPending,
    isError: isOrgsError,
  } = useOrganizationsQuery();

  if (isOrgsPending) {
    return (
      <StudioCenter>
        <StudioPageSpinner spinnerTitle={t('general.loading')} />
      </StudioCenter>
    );
  }

  if (isOrgsError) {
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
