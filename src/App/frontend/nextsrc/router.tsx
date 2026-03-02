import React from 'react';
import { createBrowserRouter, Outlet } from 'react-router';

import { GlobalData } from 'nextsrc/core/globalData';
import { AppLayout } from 'nextsrc/layouts/AppLayout';
import { ErrorPage } from 'nextsrc/layouts/error/ErrorPage';
import { queryClient } from 'nextsrc/QueryClient';
import { loader as indexLoader } from 'nextsrc/routes/index/index.loader';
import { instanceLoader } from 'nextsrc/routes/instance/instance.loader';
import { InstancePage } from 'nextsrc/routes/instance/instance.route';
import { Page } from 'nextsrc/routes/instance/task/$pageId/$pageId.route';
import { pageLoader } from 'nextsrc/routes/instance/task/$pageId/page.loader';
import { Task } from 'nextsrc/routes/instance/task/$taskId.route';
import { TaskIndex } from 'nextsrc/routes/instance/task/TaskIndex';
import { taskLoader } from 'nextsrc/routes/instance/task/task.loader';
import { instanceSelectionLoader } from 'nextsrc/routes/instance-selection/instance-selection.loader';
import { InstanceSelectionPage } from 'nextsrc/routes/instance-selection/instance-selection.route';
import { partySelectionAction } from 'nextsrc/routes/party-selection/party-selection.action';
import { partySelectionLoader } from 'nextsrc/routes/party-selection/party-selection.loader';
import { PartySelectionPage } from 'nextsrc/routes/party-selection/party-selection.route';
import { StatelessPage } from 'nextsrc/routes/stateless/stateless.route';
import { ProcessEndPage } from 'nextsrc/features/process/pages/ProcessEndPage';
import { routes } from 'nextsrc/routesBuilder';

export const router = createBrowserRouter(
  [
    {
      Component: AppLayout,
      HydrateFallback: () => null,
      errorElement: <ErrorPage />,
      children: [
        { path: routes.root, loader: indexLoader(queryClient), errorElement: <ErrorPage /> },
        { path: routes.instance, Component: InstancePage, loader: instanceLoader, errorElement: <ErrorPage /> },
        { path: routes.processEnd, element: <ProcessEndPage />, errorElement: <ErrorPage /> },
        {
          path: routes.instanceSelection,
          Component: InstanceSelectionPage,
          loader: instanceSelectionLoader(queryClient),
          errorElement: <ErrorPage />,
        },
        {
          path: routes.partySelection,
          Component: PartySelectionPage,
          loader: partySelectionLoader(queryClient),
          action: partySelectionAction(queryClient),
        },
        { path: routes.stateless, Component: StatelessPage, errorElement: <ErrorPage /> },
        {
          id: 'task',
          path: routes.task,
          Component: Task,
          loader: taskLoader,
          errorElement: <ErrorPage />,
          shouldRevalidate: ({ currentParams, nextParams }) => currentParams.taskId !== nextParams.taskId,
          children: [
            { index: true, element: <TaskIndex /> },
            { path: ':pageId', Component: Page, loader: pageLoader, errorElement: <ErrorPage /> },
          ],
        },
      ],
    },
  ],
  { basename: GlobalData.basename },
);
