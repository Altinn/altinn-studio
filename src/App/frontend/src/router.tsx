import React from 'react';
import { createBrowserRouter, Navigate, RouterContextProvider } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { GlobalData } from 'src/GlobalData';
import { apiClientsContext } from 'src/routerContexts/apiClientRouterContext';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import * as appRoute from 'src/routes/app/app.route';
import * as componentRoute from 'src/routes/component/component.route';
import * as indexRoute from 'src/routes/index/index.route';
import * as statelessIndexRoute from 'src/routes/index/stateless-index.route';
import * as statelessPageRoute from 'src/routes/index/stateless-page.route';
import * as instanceRoute from 'src/routes/instance/instance.route';
import * as instanceIndexRoute from 'src/routes/instance/instance-index.route';
import * as instanceSelectionRoute from 'src/routes/instance-selection/instance-selection.route';
import * as pageRoute from 'src/routes/page/page.route';
import * as partySelectionRoute from 'src/routes/party-selection/party-selection.route';
import * as processEndRoute from 'src/routes/process-end/process-end.route';
import { convertRouteModule } from 'src/routes/routeModule';
import * as taskRoute from 'src/routes/task/task.route';
import * as taskIndexRoute from 'src/routes/task/task-index.route';
import { buildPartySelectionUrl, routes, TaskKeys } from 'src/routesBuilder';
import type { ApiClients } from 'src/core/api-client/ApiClients';

export function createRouter({ queryClient, apiClients }: { queryClient: QueryClient; apiClients: ApiClients }) {
  return createBrowserRouter(
    [
      {
        ...convertRouteModule(appRoute),
        children: [
          {
            path: routes.instanceSelection,
            ...convertRouteModule(instanceSelectionRoute),
          },
          {
            path: routes.partySelectionCatchAll,
            ...convertRouteModule(partySelectionRoute),
          },
          {
            ...convertRouteModule(indexRoute),
            children: [
              { path: routes.statelessPage, ...convertRouteModule(statelessPageRoute) },
              { index: true, ...convertRouteModule(statelessIndexRoute) },
            ],
          },
          {
            path: routes.instance,
            ...convertRouteModule(instanceRoute),
            children: [
              { index: true, ...convertRouteModule(instanceIndexRoute) },
              { path: TaskKeys.ProcessEnd, ...convertRouteModule(processEndRoute) },
              {
                path: routes.task,
                ...convertRouteModule(taskRoute),
                children: [
                  { index: true, ...convertRouteModule(taskIndexRoute) },
                  {
                    path: routes.page,
                    children: [
                      { index: true, ...convertRouteModule(pageRoute) },
                      { path: routes.componentCatchAll, ...convertRouteModule(componentRoute) },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: routes.partySelectionLegacyCatchAll,
        element: (
          <Navigate
            to={buildPartySelectionUrl()}
            replace
          />
        ),
      },
    ],
    {
      basename: GlobalData.basename,
      getContext() {
        const context = new RouterContextProvider();
        context.set(queryClientContext, queryClient);
        context.set(apiClientsContext, apiClients);
        return context;
      },
    },
  );
}
