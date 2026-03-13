import React from 'react';
import { createWorkspaceRoutes } from 'app-shared/routes/createWorkspaceRoutes';
import { PageLayout } from '../layout/PageLayout';
import { LandingPage } from '../pages/LandingPage';

const BASE_PATH = '/:org/:app';

const routeDefinitions = [
  { index: true, element: <LandingPage /> },
  { path: ':layoutSet', element: <LandingPage /> },
];

export const routes = createWorkspaceRoutes({
  layoutElement: <PageLayout />,
  basePath: BASE_PATH,
  routeDefinitions,
});
