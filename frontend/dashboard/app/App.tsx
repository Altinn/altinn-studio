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
import { Trans, useTranslation } from 'react-i18next';
import {
  APP_DASHBOARD_BASENAME,
  DASHBOARD_ROOT_ROUTE,
  ORG_LIBRARY_BASENAME,
} from 'app-shared/constants';
import { Link } from '@digdir/designsystemet-react';
import { OrgContentLibrary } from '../pages/OrgContentLibrary';
import { useSubRoute } from '../hooks/useSubRoute';

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
        message={
          <Trans
            i18nKey={'dashboard.error_unknown.message'}
            components={{
              a: <Link href='/contact'> </Link>,
            }}
          />
        }
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
            <Route path='/:subRoute/:selectedContext?' element={<SubRouteGuard />} />
            <Route
              path='/:subRoute/:selectedContext/new'
              element={<CreateService organizations={organizations} user={user} />}
            />
          </Route>
        </Routes>
      </div>
    );
  }

  return (
    <div className={classes.appDashboardSpinner}>
      <StudioPageSpinner spinnerTitle={t('dashboard.loading')} />
    </div>
  );
};

function SubRouteGuard(): React.ReactElement {
  const subRoute = useSubRoute();
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();

  switch (subRoute) {
    case APP_DASHBOARD_BASENAME.replace('/', ''):
      return <Dashboard user={user} organizations={organizations} />;

    case ORG_LIBRARY_BASENAME.replace('/', ''):
      return <OrgContentLibrary />;
  }
}
