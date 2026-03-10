import React from 'react';
import { Navigate } from 'react-router-dom';
import { RoutePaths } from 'admin/enums/RoutePaths';
import { App } from 'admin/layout/App';
import { PageLayout } from 'admin/layout/PageLayout';
import { createWorkspaceRoutes } from 'app-shared/routes/createWorkspaceRoutes';
import { AppsDetails } from 'admin/features/appDetails/AppDetails';
import { Apps } from 'admin/features/apps/Apps';
import { InstanceDetails } from 'admin/features/instanceDetails/InstanceDetails';

const BASE_PATH = '/:org';

const routeDefinitions = [
  { path: RoutePaths.Root, element: <Navigate to={RoutePaths.Apps} /> },
  { path: RoutePaths.Apps, element: <Apps /> },
  { path: RoutePaths.App, element: <AppsDetails /> },
  { path: RoutePaths.Instance, element: <InstanceDetails /> },
];

export const routes = createWorkspaceRoutes({
  appElement: <App />,
  layoutElement: <PageLayout />,
  basePath: BASE_PATH,
  routeDefinitions,
});
