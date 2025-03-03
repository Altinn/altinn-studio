import { Outlet } from 'react-router-dom';
import { useOrganizationsQuery } from 'dashboard/hooks/queries';
import { useUserQuery } from 'app-shared/hooks/queries';
import React, { useMemo } from 'react';
import { type HeaderContextType } from 'dashboard/context/HeaderContext';
import { useTranslation } from 'react-i18next';
import { StudioPageSpinner } from '@studio/components';
import { useContextRedirectionGuard } from 'dashboard/hooks/guards/useContextRedirectionGuard';
import { DashboardHeader } from './DashboardHeader';
import { HeaderContextProvider } from 'dashboard/context/HeaderContext/HeaderContext';

export const PageLayout = () => {
  const { t } = useTranslation();
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();
  const { isRedirectionComplete } = useContextRedirectionGuard(organizations);

  const headerContextValue: Partial<HeaderContextType> = useMemo(
    () => ({
      selectableOrgs: organizations,
      user,
    }),
    [organizations, user],
  );

  if (!isRedirectionComplete) return <StudioPageSpinner spinnerTitle={t('dashboard.loading')} />;

  return (
    <>
      <HeaderContextProvider
        user={headerContextValue.user}
        selectableOrgs={headerContextValue.selectableOrgs}
      >
        <DashboardHeader />
      </HeaderContextProvider>
      <Outlet />
    </>
  );
};
