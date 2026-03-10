import React from 'react';
import { createWorkspaceRoutes } from 'app-shared/routes/createWorkspaceRoutes';
import { PageLayout } from '../layout';
import { ContactPage } from '../pages/Contact/ContactPage';
import { FlagsPage } from 'studio-root/pages/FlagsPage/FlagsPage';

const routeDefinitions = [
  { path: '/contact', element: <ContactPage /> },
  { path: '/flags', element: <FlagsPage /> },
];

export const routes = createWorkspaceRoutes({
  layoutElement: <PageLayout />,
  routeDefinitions,
});
