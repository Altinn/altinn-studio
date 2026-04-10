import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { AppLayout } from 'src/AppLayout';
import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { ComponentRouting, NavigateToStartUrl } from 'src/components/wrappers/ProcessWrapper';
import { instanceApi } from 'src/core/api-client/instance.api';
import { partyApi } from 'src/core/api-client/party.api';
import { GlobalData } from 'src/GlobalData';
import { indexLoader } from 'src/routes/index/index.loader';
import { Component as IndexRoute } from 'src/routes/index/index.route';
import { instanceLoader } from 'src/routes/instance/instance.loader';
import { Component as InstanceRoute } from 'src/routes/instance/instance.route';
import { instanceSelectionLoader } from 'src/routes/instance-selection/instance-selection.loader';
import { Component as InstanceSelectionRoute } from 'src/routes/instance-selection/instance-selection.route';
import { Component as PageRoute } from 'src/routes/page/page.route';
import { partySelectionLoader } from 'src/routes/party-selection/party-selection.loader';
import { Component as PartySelectionRoute } from 'src/routes/party-selection/party-selection.route';
import { Component as ProcessEndRoute } from 'src/routes/process-end/process-end.route';
import { taskLoader } from 'src/routes/task/task.loader';
import { Component as TaskRoute } from 'src/routes/task/task.route';
import { routes } from 'src/routesBuilder';

export function createRouter(queryClient: QueryClient) {
  return createBrowserRouter(
    [
      {
        Component: AppLayout,
        // Prevents a console error about missing HydrateFallback when using loaders
        HydrateFallback: () => null,
        children: [
          {
            path: routes.root,
            Component: IndexRoute,
            loader: indexLoader(queryClient, instanceApi),
            children: [
              {
                path: routes.statelessPage,
                Component: () => (
                  <PresentationComponent>
                    <Form />
                  </PresentationComponent>
                ),
              },
              { index: true, element: <NavigateToStartUrl forceCurrentTask={false} /> },
            ],
          },
          {
            path: routes.instance,
            Component: InstanceRoute,
            loader: instanceLoader(queryClient, instanceApi),
            children: [
              { index: true, element: <NavigateToStartUrl /> },
              { path: 'ProcessEnd', Component: ProcessEndRoute },
              {
                path: routes.task,
                Component: TaskRoute,
                loader: taskLoader(queryClient, instanceApi),
                children: [
                  { index: true, element: <NavigateToStartUrl forceCurrentTask={false} /> },
                  {
                    path: routes.page,
                    children: [
                      {
                        index: true,
                        Component: PageRoute,
                      },
                      {
                        path: routes.component,
                        children: [
                          { index: true, element: <ComponentRouting /> },
                          { path: '*', element: <ComponentRouting /> },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            path: routes.instanceSelection,
            Component: InstanceSelectionRoute,
            loader: instanceSelectionLoader(queryClient, partyApi, instanceApi),
          },
          {
            path: routes.partySelection,
            loader: partySelectionLoader(queryClient, partyApi),
            children: [
              { index: true, Component: PartySelectionRoute },
              { path: '*', Component: PartySelectionRoute },
            ],
          },
        ],
      },
      {
        path: routes.partySelectionLegacy,
        children: [
          {
            index: true,
            element: (
              <Navigate
                to='/party-selection'
                replace
              />
            ),
          },
          {
            path: '*',
            element: (
              <Navigate
                to='/party-selection'
                replace
              />
            ),
          },
        ],
      },
    ],
    {
      basename: GlobalData.basename,
    },
  );
}
