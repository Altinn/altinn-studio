import React from 'react';
import { Route } from 'react-router-dom';
import { APP_DASHBOARD_BASENAME, ORG_LIBRARY_BASENAME } from 'app-shared/constants';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useOrganizationsQuery } from '../hooks/queries';
import { App } from '../app/App';
import { PageLayout } from '../pages/PageLayout';
import { Dashboard } from '../pages/Dashboard';
import { CreateService } from '../pages/CreateService';
import { OrgContentLibraryPage } from '../pages/OrgContentLibraryPage';

function DashboardPage(): React.ReactElement {
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();
  return <Dashboard user={user} organizations={organizations} />;
}

function CreateServicePage(): React.ReactElement {
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();
  return <CreateService user={user} organizations={organizations} />;
}

export const routes = (
  <Route element={<App />}>
    <Route element={<PageLayout />}>
      <Route path={`${APP_DASHBOARD_BASENAME}/:selectedContext?`} element={<DashboardPage />} />
      <Route
        path={`${APP_DASHBOARD_BASENAME}/:selectedContext/new`}
        element={<CreateServicePage />}
      />
      <Route
        path={`${ORG_LIBRARY_BASENAME}/:selectedContext?/:elementType?`}
        element={<OrgContentLibraryPage />}
      />
    </Route>
  </Route>
);
