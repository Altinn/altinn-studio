import React from 'react';
import classes from './App.module.css';
import { StudioPageSpinner, StudioPageError } from '@studio/components';
import { CreateService } from '../pages/CreateService';
import { Dashboard } from '../pages/Dashboard';
import { Route, Routes } from 'react-router-dom';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useOrganizationsQuery } from '../hooks/queries';

import './App.css';
import { PageLayout } from 'dashboard/pages/PageLayout';
import { useTranslation } from 'react-i18next';
import { DASHBOARD_ROOT_ROUTE } from 'app-shared/constants';

export const App = (): JSX.Element => {
  const { t } = useTranslation();

  const { data: user, isError: isUserError } = useUserQuery();
  const { data: organizations, isError: isOrganizationsError } = useOrganizationsQuery();

  const componentIsReady = user && organizations;
  const componentHasError = isUserError || isOrganizationsError;

  const getErrorMessage = () => {
    if (isUserError) {
      return (
        <StudioPageError
          title={t('dashboard.error_getting_user_data.title')}
          message={t('dashboard.error_getting_user_data.message')}
        />
      );
    }
    if (isOrganizationsError) {
      return (
        <StudioPageError
          title={t('dashboard.error_getting_organization_data.title')}
          message={t('dashboard.error_getting_organization_data.message')}
        />
      );
    }
    return (
      <StudioPageError
        title={t('dashboard.error_unknown.title')}
        message={t('dashboard.error_unknown.message')}
      />
    );
  };

  if (componentHasError) {
    return getErrorMessage();
  }

  if (componentIsReady) {
    return (
      <div className={classes.root}>
        <Routes>
          <Route path={DASHBOARD_ROOT_ROUTE} element={<PageLayout />}>
            <Route
              path='/:selectedContext?'
              element={<Dashboard user={user} organizations={organizations} />}
            />
            <Route
              path='/:selectedContext/new'
              element={<CreateService organizations={organizations} user={user} />}
            />
          </Route>
        </Routes>
      </div>
    );
  }

  return (
    <div className={classes.appDashboardSpinner}>
      <StudioPageSpinner showSpinnerTitle={false} spinnerTitle={t('dashboard.loading')} />
    </div>
  );
};
