import { Outlet } from 'react-router-dom';
import { useOrganizationsQuery } from '../../hooks/queries';
import { useUserQuery } from 'app-shared/hooks/queries';
import React, { useMemo } from 'react';
import { HeaderContextProvider, type HeaderContextProps } from '../../context/HeaderContext';
import { useTranslation } from 'react-i18next';
import { StudioPageSpinner } from '@studio/components-legacy';
import { useContextRedirectionGuard } from '../../hooks/guards/useContextRedirectionGuard';
import { DashboardHeader } from './DashboardHeader';

export const PageLayout = () => {
  const { t } = useTranslation();
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();
  const { isRedirectionComplete } = useContextRedirectionGuard(organizations);

  const headerContextValue: Partial<HeaderContextProps> = useMemo(
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
