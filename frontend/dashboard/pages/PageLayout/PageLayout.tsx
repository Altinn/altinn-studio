import AppHeader, { HeaderContext } from 'app-shared/navigation/main-header/Header';
import { Outlet } from 'react-router-dom';
import { useOrganizationsQuery } from 'dashboard/hooks/queries';
import { useUserQuery } from 'app-shared/hooks/queries';
import React, { useMemo } from 'react';
import type { IHeaderContext } from 'app-shared/navigation/main-header/Header';
import { useTranslation } from 'react-i18next';

import { StudioPageSpinner } from '@studio/components';
import { useContextRedirectionGuard } from 'dashboard/hooks/guards/useContextRedirectionGuard';

export const PageLayout = () => {
  const { t } = useTranslation();
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();
  const { isRedirectionComplete } = useContextRedirectionGuard(organizations);

  const headerContextValue: IHeaderContext = useMemo(
    () => ({
      selectableOrgs: organizations,
      user,
    }),
    [organizations, user],
  );

  if (!isRedirectionComplete) return <StudioPageSpinner spinnerTitle={t('dashboard.loading')} />;
  return (
    <>
      <HeaderContext.Provider value={headerContextValue}>
        <AppHeader />
      </HeaderContext.Provider>
      <Outlet />
    </>
  );
};
