import React from 'react';
import { APP_DASHBOARD_BASENAME, ORG_LIBRARY_BASENAME } from 'app-shared/constants';
import { createWorkspaceRoutes } from 'app-shared/routes/createWorkspaceRoutes';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useOrganizationsQuery } from '../hooks/queries';
import { App } from '../app/App';
import { PageLayout } from '../layout/PageLayout';
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

const routeDefinitions = [
  { path: `${APP_DASHBOARD_BASENAME}/:selectedContext?`, element: <DashboardPage /> },
  { path: `${APP_DASHBOARD_BASENAME}/:selectedContext/new`, element: <CreateServicePage /> },
  {
    path: `${ORG_LIBRARY_BASENAME}/:selectedContext?/:elementType?`,
    element: <OrgContentLibraryPage />,
  },
];

export const routes = createWorkspaceRoutes({
  appElement: <App />,
  layoutElement: <PageLayout />,
  routeDefinitions,
});
