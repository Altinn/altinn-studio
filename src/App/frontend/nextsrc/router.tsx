import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { GlobalData } from 'nextsrc/core/globalData';
import { ErrorPage } from 'nextsrc/layouts/error/ErrorPage';
import { RootLayout } from 'nextsrc/layouts/RootLayout';
import { queryClient } from 'nextsrc/QueryClient';
import { loader as indexLoader } from 'nextsrc/routes/index/index.loader';
import { instanceLoader } from 'nextsrc/routes/instance/instance.loader';
import { InstancePage } from 'nextsrc/routes/instance/instance.route';
import { Page } from 'nextsrc/routes/instance/task/$pageId/$pageId.route';
import { pageLoader } from 'nextsrc/routes/instance/task/$pageId/page.loader';
import { Task } from 'nextsrc/routes/instance/task/$taskId.route';
import { taskLoader } from 'nextsrc/routes/instance/task/task.loader';
import { instanceSelectionLoader } from 'nextsrc/routes/instance-selection/instance-selection.loader';
import { InstanceSelectionPage } from 'nextsrc/routes/instance-selection/instance-selection.route';
import { partySelectionAction } from 'nextsrc/routes/party-selection/party-selection.action';
import { partySelectionLoader } from 'nextsrc/routes/party-selection/party-selection.loader';
import { PartySelectionPage } from 'nextsrc/routes/party-selection/party-selection.route';
import { StatelessPage } from 'nextsrc/routes/stateless/stateless.route';
import { routes } from 'nextsrc/routesBuilder';

export const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      children: [
        { path: routes.root, loader: indexLoader(queryClient), errorElement: <ErrorPage /> },
        {
          path: routes.instanceSelection,
          element: <InstanceSelectionPage />,
          loader: instanceSelectionLoader(queryClient),
          errorElement: <ErrorPage />,
        },
        {
          path: routes.partySelection,
          element: <PartySelectionPage />,
          loader: partySelectionLoader(queryClient),
          action: partySelectionAction(queryClient),
        },
        { path: routes.stateless, element: <StatelessPage /> },
        { path: routes.instance, element: <InstancePage />, loader: instanceLoader },
        { path: routes.task, element: <Task />, loader: taskLoader },
        { path: routes.page, element: <Page />, loader: pageLoader },
      ],
    },
  ],
  { basename: GlobalData.basename },
);
