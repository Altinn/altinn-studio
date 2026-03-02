import React from 'react';
import { createBrowserRouter, Outlet } from 'react-router';

import { AppLayout } from 'nextsrc/core/app-layout/app-layout';
import { GlobalData } from 'nextsrc/core/globalData';
import { Page } from 'nextsrc/features/form/pages/page/page';
import { pageLoader } from 'nextsrc/features/form/pages/page/pageLoader';
import { Task } from 'nextsrc/features/form/pages/task/task';
import { TaskIndex } from 'nextsrc/features/form/pages/task/TaskIndex';
import { taskLoader } from 'nextsrc/features/form/pages/task/taskLoader';
import { entryRedirectLoader } from 'nextsrc/features/instantiate/loaders/entryRedirectLoader';
import { ErrorPage } from 'nextsrc/features/instantiate/pages/error/ErrorPage';
import { instanceLoader } from 'nextsrc/features/instantiate/pages/instance/instanceLoader';
import { InstancePage } from 'nextsrc/features/instantiate/pages/instance/InstancePage';
import { instanceSelectionLoader } from 'nextsrc/features/instantiate/pages/instance-selection/instanceSelectionLoader';
import { InstanceSelectionPage } from 'nextsrc/features/instantiate/pages/instance-selection/InstanceSelectionPage';
import { partySelectionLoader } from 'nextsrc/features/instantiate/pages/party-selection/partySelectionLoader';
import { PartySelectionPage } from 'nextsrc/features/instantiate/pages/party-selection/PartySelectionPage';
import { StatelessPage } from 'nextsrc/features/instantiate/pages/stateless/StatelessPage';
import { ProcessEndPage } from 'nextsrc/features/process/pages/ProcessEndPage';
import { routes } from 'nextsrc/routesBuilder';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      HydrateFallback: () => null,
      errorElement: <ErrorPage />,
      children: [
        { path: routes.root, element: <Outlet />, loader: entryRedirectLoader(), errorElement: <ErrorPage /> },
        { path: routes.instance, element: <InstancePage />, loader: instanceLoader, errorElement: <ErrorPage /> },
        { path: routes.processEnd, element: <ProcessEndPage />, errorElement: <ErrorPage /> },
        {
          path: routes.instanceSelection,
          element: <InstanceSelectionPage />,
          loader: instanceSelectionLoader,
          errorElement: <ErrorPage />,
        },
        {
          path: routes.partySelection,
          element: <PartySelectionPage />,
          loader: partySelectionLoader,
          errorElement: <ErrorPage />,
        },
        { path: routes.stateless, element: <StatelessPage />, errorElement: <ErrorPage /> },
        {
          id: 'task',
          path: routes.task,
          element: <Task />,
          loader: taskLoader,
          errorElement: <ErrorPage />,
          shouldRevalidate: ({ currentParams, nextParams }) => currentParams.taskId !== nextParams.taskId,
          children: [
            { index: true, element: <TaskIndex /> },
            { path: ':pageId', element: <Page />, loader: pageLoader, errorElement: <ErrorPage /> },
          ],
        },
      ],
    },
  ],
  { basename: GlobalData.basename },
);
