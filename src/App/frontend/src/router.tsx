import React from 'react';
import { createBrowserRouter, Navigate, RouterContextProvider } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { AppLayout } from 'src/AppLayout';
import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { ComponentRouting } from 'src/components/wrappers/ProcessWrapper';
import { instanceApi } from 'src/core/api-client/instance.api';
import { partyApi } from 'src/core/api-client/party.api';
import { Loader } from 'src/core/loading/Loader';
import { GlobalData } from 'src/GlobalData';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import { indexLoader } from 'src/routes/index/index.loader';
import { Component as IndexRoute } from 'src/routes/index/index.route';
import { statelessIndexLoader } from 'src/routes/index/stateless-index.loader';
import { instanceLoader } from 'src/routes/instance/instance.loader';
import { Component as InstanceRoute, ErrorBoundary as InstanceErrorBoundary } from 'src/routes/instance/instance.route';
import { instanceIndexLoader } from 'src/routes/instance/instance-index.loader';
import { instanceSelectionLoader } from 'src/routes/instance-selection/instance-selection.loader';
import { Component as InstanceSelectionRoute } from 'src/routes/instance-selection/instance-selection.route';
import { Component as PageRoute } from 'src/routes/page/page.route';
import { partySelectionLoader } from 'src/routes/party-selection/party-selection.loader';
import { Component as PartySelectionRoute } from 'src/routes/party-selection/party-selection.route';
import { Component as ProcessEndRoute } from 'src/routes/process-end/process-end.route';
import { taskLoader } from 'src/routes/task/task.loader';
import { Component as TaskRoute } from 'src/routes/task/task.route';
import { taskIndexLoader } from 'src/routes/task/task-index.loader';
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
            path: routes.instanceSelection,
            Component: InstanceSelectionRoute,
            loader: instanceSelectionLoader(partyApi, instanceApi),
          },
          {
            path: routes.partySelection,
            loader: partySelectionLoader(partyApi),
            children: [
              { index: true, Component: PartySelectionRoute },
              { path: '*', Component: PartySelectionRoute },
            ],
          },
          {
            Component: IndexRoute,
            loader: indexLoader(instanceApi),
            children: [
              {
                path: routes.statelessPage,
                Component: () => (
                  <PresentationComponent>
                    <Form />
                  </PresentationComponent>
                ),
              },
              { index: true, loader: statelessIndexLoader(), Component: () => <Loader reason='stateless-redirect' /> },
            ],
          },
          {
            path: routes.instance,
            Component: InstanceRoute,
            ErrorBoundary: InstanceErrorBoundary,
            loader: instanceLoader(instanceApi),
            shouldRevalidate: ({ currentParams, nextParams }) =>
              currentParams.instanceOwnerPartyId !== nextParams.instanceOwnerPartyId ||
              currentParams.instanceGuid !== nextParams.instanceGuid,
            children: [
              {
                index: true,
                loader: instanceIndexLoader(instanceApi),
                Component: () => <Loader reason='instance-redirect' />,
              },
              { path: 'ProcessEnd', Component: ProcessEndRoute },
              {
                path: routes.task,
                Component: TaskRoute,
                loader: taskLoader(instanceApi),
                children: [
                  {
                    index: true,
                    loader: taskIndexLoader(instanceApi),
                    Component: () => <Loader reason='task-redirect' />,
                  },
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
      getContext() {
        const context = new RouterContextProvider();
        context.set(queryClientContext, queryClient);
        return context;
      },
    },
  );
}
