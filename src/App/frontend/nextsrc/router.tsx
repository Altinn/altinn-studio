import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

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
import { routes } from 'nextsrc/routesBuilder';

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
