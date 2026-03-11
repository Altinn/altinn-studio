import React from 'react';
import { createWorkspaceRoutes } from 'app-shared/routes/createWorkspaceRoutes';
import { App } from '../app/App';
import { PageLayout } from '../layout/PageLayout';
import { ResourcePage } from '../pages/ResourcePage';
import { ResourceDashboardPage } from '../pages/ResourceDashboardPage';
import { RedirectPage } from '../pages/RedirectPage';
import { ListAdminPage } from '../pages/ListAdminPage';
import { AccessListPage } from '../pages/AccessListPage';

const BASE_PATH = '/:org/:app';

const routeDefinitions = [
  { path: BASE_PATH, element: <ResourceDashboardPage /> },
  { path: `${BASE_PATH}/accesslists/:env?`, element: <ListAdminPage /> },
  { path: `${BASE_PATH}/accesslists/:env/:accessListId`, element: <AccessListPage /> },
  {
    path: `${BASE_PATH}/resource/:resourceId/:pageType/:env?/:accessListId?`,
    element: <ResourcePage />,
  },
  { path: '/:org', element: <RedirectPage /> },
];

export const routes = createWorkspaceRoutes({
  appElement: <App />,
  layoutElement: <PageLayout />,
  routeDefinitions,
});
