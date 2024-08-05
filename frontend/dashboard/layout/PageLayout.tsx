import AppHeader, { HeaderContext } from 'app-shared/navigation/main-header/Header';
import { Outlet } from 'react-router-dom';
import { useOrganizationsQuery } from 'dashboard/hooks/queries';
import { useUserQuery } from 'app-shared/hooks/queries';
import React, { useMemo } from 'react';
import type { IHeaderContext } from 'app-shared/navigation/main-header/Header';
import { useTranslation } from 'react-i18next';
import classes from './PageLayout.module.css';

import { ErrorMessage } from 'dashboard/components/ErrorMessage';
import { StudioPageSpinner } from '@studio/components';
import { useContextRedirectionGuard } from 'dashboard/hooks/guards/useContextRedirectionGuard';

export const PageLayout = () => {
  const { t } = useTranslation();
  const { data: user, isPending: isUserPending, isError: isUserError } = useUserQuery();
  const {
    data: organizations,
    isPending: isOrganizationsPending,
    isError: isOrganizationsError,
  } = useOrganizationsQuery();
  const { isRedirectionComplete } = useContextRedirectionGuard(organizations);

  const headerContextValue: IHeaderContext = useMemo(
    () => ({
      selectableOrgs: organizations,
      user,
    }),
    [organizations, user],
  );

  const componentIsPending = isUserPending || isOrganizationsPending || !isRedirectionComplete;
  if (componentIsPending) {
    return (
      <div className={classes.appDashboardSpinner}>
        <StudioPageSpinner showSpinnerTitle={false} spinnerTitle={t('dashboard.loading')} />
      </div>
    );
  }

  const getErrorMessage = (): { title: string; message: string } => {
    if (isUserError) {
      return {
        title: t('dashboard.error_getting_user_data.title'),
        message: t('dashboard.error_getting_user_data.message'),
      };
    }
    if (isOrganizationsError) {
      return {
        title: t('dashboard.error_getting_organization_data.title'),
        message: t('dashboard.error_getting_organization_data.message'),
      };
    }
    return {
      title: t('dashboard.error_unknown.title'),
      message: t('dashboard.error_unknown.message'),
    };
  };

  const componentHasError = isUserError || isOrganizationsError;
  if (componentHasError) {
    const error = getErrorMessage();
    return <ErrorMessage title={error.title} message={error.message} />;
  }

  return (
    <div className={classes.root}>
      <HeaderContext.Provider value={headerContextValue}>
        <AppHeader />
      </HeaderContext.Provider>
      <Outlet />
    </div>
  );
};
