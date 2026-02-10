import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { GlobalData } from 'nextsrc/core/globalData';
import { Page } from 'nextsrc/features/form/pages/page/page';
import { Task } from 'nextsrc/features/form/pages/task/task';
import { taskLoader } from 'nextsrc/features/form/pages/task/taskLoader';
import { entryRedirectLoader } from 'nextsrc/features/instantiate/loaders/entryRedirectLoader';
import { ErrorPage } from 'nextsrc/features/instantiate/pages/error/ErrorPage';
import { InstancePage } from 'nextsrc/features/instantiate/pages/instance/InstancePage';
import { InstanceSelectionPage } from 'nextsrc/features/instantiate/pages/instance-selection/InstanceSelectionPage';
import { PartySelectionPage } from 'nextsrc/features/instantiate/pages/party-selection/PartySelectionPage';
import { StatelessPage } from 'nextsrc/features/instantiate/pages/stateless/StatelessPage';
import { instantiateRoutes } from 'nextsrc/features/instantiate/routes';
import { queryClient } from 'nextsrc/QueryClient';

export const router = createBrowserRouter(
  [
    { path: instantiateRoutes.root, loader: entryRedirectLoader(queryClient), errorElement: <ErrorPage /> },
    { path: instantiateRoutes.instance, element: <InstancePage /> },
    { path: instantiateRoutes.instanceSelection, element: <InstanceSelectionPage /> },
    { path: instantiateRoutes.partySelection, element: <PartySelectionPage /> },
    { path: instantiateRoutes.stateless, element: <StatelessPage /> },
    { path: instantiateRoutes.task, element: <Task />, loader: taskLoader },
    { path: instantiateRoutes.page, element: <Page /> },
  ],
  { basename: GlobalData.basename },
);
