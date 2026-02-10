import React from 'react';
import { createBrowserRouter, generatePath } from 'react-router-dom';

import { GlobalData } from 'nextsrc/core/globalData';
import { Page } from 'nextsrc/features/form/pages/page/page';
import { pageLoader } from 'nextsrc/features/form/pages/page/pageLoader';
import { Task } from 'nextsrc/features/form/pages/task/task';
import { taskLoader } from 'nextsrc/features/form/pages/task/taskLoader';
import { entryRedirectLoader } from 'nextsrc/features/instantiate/loaders/entryRedirectLoader';
import { ErrorPage } from 'nextsrc/features/instantiate/pages/error/ErrorPage';
import { InstancePage } from 'nextsrc/features/instantiate/pages/instance/InstancePage';
import { InstanceSelectionPage } from 'nextsrc/features/instantiate/pages/instance-selection/InstanceSelectionPage';
import { PartySelectionPage } from 'nextsrc/features/instantiate/pages/party-selection/PartySelectionPage';
import { StatelessPage } from 'nextsrc/features/instantiate/pages/stateless/StatelessPage';
import { queryClient } from 'nextsrc/QueryClient';

// Route patterns (for router declaration)
export const routes = {
  root: '/',
  partySelection: '/party-selection',
  instance: '/instance/:instanceOwnerPartyId/:instanceGuid',
  task: '/instance/:instanceOwnerPartyId/:instanceGuid/:taskId',
  page: '/instance/:instanceOwnerPartyId/:instanceGuid/:taskId/:pageId',
  instanceSelection: '/instance-selection',
  stateless: '/:pageId',
} as const;

export const router = createBrowserRouter(
  [
    { path: routes.root, loader: entryRedirectLoader(queryClient), errorElement: <ErrorPage /> },
    { path: routes.instance, element: <InstancePage /> },
    { path: routes.instanceSelection, element: <InstanceSelectionPage /> },
    { path: routes.partySelection, element: <PartySelectionPage /> },
    { path: routes.stateless, element: <StatelessPage /> },
    { path: routes.task, element: <Task />, loader: taskLoader },
    { path: routes.page, element: <Page />, loader: pageLoader },
  ],
  { basename: GlobalData.basename },
);

// URL builders (for navigation)
export const routeBuilders = buildRoutes(routes);

function routeBuilder<P extends string>(pattern: P) {
  return (params: Parameters<typeof generatePath<P>>[1]) => generatePath(pattern, params);
}

function buildRoutes<T extends Record<string, string>>(routes: T) {
  return Object.fromEntries(Object.entries(routes).map(([key, pattern]) => [key, routeBuilder(pattern)])) as {
    [K in keyof T]: ReturnType<typeof routeBuilder<T[K]>>;
  };
}
