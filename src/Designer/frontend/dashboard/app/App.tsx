import React from 'react';
import classes from './App.module.css';
import { StudioPageSpinner, StudioPageError } from '@studio/components-legacy';
import { CreateService } from '../pages/CreateService';
import { Dashboard } from '../pages/Dashboard';
import { Route, Routes } from 'react-router-dom';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useOrganizationsQuery } from '../hooks/queries';

import './App.css';
import { PageLayout } from 'dashboard/pages/PageLayout';
import { useTranslation } from 'react-i18next';
import {
  APP_DASHBOARD_BASENAME,
  DASHBOARD_ROOT_ROUTE,
  ORG_LIBRARY_BASENAME,
} from 'app-shared/constants';
import { OrgContentLibraryPage } from '../pages/OrgContentLibraryPage';
import { useSubroute } from '../hooks/useSubRoute';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';
import type { QueryStatus } from '@tanstack/react-query';

export function App(): React.ReactElement {
  const { data: user, status: userStatus } = useUserQuery();
  const { data: organizations, status: organizationsStatus } = useOrganizationsQuery();

  const queryStatus = mergeQueryStatuses(userStatus, organizationsStatus);

  switch (queryStatus) {
    case 'pending':
      return <PendingPage />;
    case 'error':
      return <ErrorMessage userStatus={userStatus} />;
    case 'success':
      return <AppWithData user={user} organizations={organizations} />;
  }
}

function PendingPage(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className={classes.appDashboardSpinner}>
      <StudioPageSpinner spinnerTitle={t('dashboard.loading')} />
    </div>
  );
}

type ErrorMessageProps = {
  userStatus: QueryStatus;
};

function ErrorMessage({ userStatus }: ErrorMessageProps): React.ReactElement {
  const { t } = useTranslation();

  if (userStatus === 'error') {
    return (
      <StudioPageError
        title={t('dashboard.error_getting_user_data.title')}
        message={t('dashboard.error_getting_user_data.message')}
      />
    );
  } else {
    return (
      <StudioPageError
        title={t('dashboard.error_getting_organization_data.title')}
        message={t('dashboard.error_getting_organization_data.message')}
      />
    );
  }
}

type AppWithDataProps = {
  user: User;
  organizations: Organization[];
};

function AppWithData(props: AppWithDataProps): React.ReactElement {
  return (
    <div className={classes.root}>
      <Routes>
        <Route path={DASHBOARD_ROOT_ROUTE} element={<PageLayout />}>
          <Route path='/:subroute/:selectedContext?' element={<SubrouteGuard {...props} />} />
          <Route path='/:subroute/:selectedContext/new' element={<CreateService {...props} />} />
        </Route>
      </Routes>
    </div>
  );
}

function SubrouteGuard(props: AppWithDataProps): React.ReactElement {
  const subroute = useSubroute();
  const subrouteWithLeadingSlash = '/' + subroute;

  switch (subrouteWithLeadingSlash) {
    case APP_DASHBOARD_BASENAME:
      return <Dashboard {...props} />;

    case ORG_LIBRARY_BASENAME:
      return <OrgContentLibraryPage />;
  }
}
