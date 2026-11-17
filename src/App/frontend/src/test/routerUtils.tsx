import React, { useState } from 'react';
import { createMemoryRouter, LoaderFunctionArgs, RouterContextProvider, RouterProvider } from 'react-router';
import type { PropsWithChildren } from 'react';

import { useAppMutations, useAppQueries, useAppQueryClient } from 'src/core/queries/AppQueriesProvider';
import { instanceRoutes } from 'src/router';
import { appQueriesContext } from 'src/routerContexts/appQueriesRouterContext';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';

export const PageNavigationRouter =
  ({ currentPageId = 'layout1', currentTaskId = 'Task_1' } = {}) =>
  // eslint-disable-next-line react/display-name
  ({ children }: { children: React.ReactNode }) => {
    const router = createMemoryRouter(
      [
        {
          path: 'instance/:instanceOwnerPartyId/:instanceGuid/:taskId/:pageId',
          element: children,
        },
      ],
      {
        basename: '/ttd/test',
        initialEntries: [
          `/ttd/test/instance/1337/dfe95272-6873-48a6-abae-57b3f7c18689/${currentTaskId}/${currentPageId}`,
        ],
      },
    );

    return <RouterProvider router={router} />;
  };

export function createLoaderFunctionArgs(partialArgs: Partial<LoaderFunctionArgs>): LoaderFunctionArgs {
  return {
    request: partialArgs.request ?? new Request('http://localhost/'),
    params: partialArgs.params ?? {},
    context: partialArgs.context ?? new RouterContextProvider(),
    pattern: partialArgs.pattern ?? '',
    url: partialArgs.url ?? new URL('http://localhost/'),
  };
}

/**
 * Routes `path` through the app's real instance, task and page routes, loaders included, with the query client
 * and API clients of the surrounding providers. `children` takes the place of the app layout route above them, so
 * the renderer must render an `<Outlet />`.
 */
export function InstanceRoutesRouter({ children, path }: PropsWithChildren<{ path: string }>) {
  const queryClient = useAppQueryClient();
  const queries = { ...useAppQueries(), ...useAppMutations() };

  // Created once, so a re-render does not run the loaders again
  const [router] = useState(() =>
    createMemoryRouter([{ element: children, HydrateFallback: () => null, children: [instanceRoutes] }], {
      basename: '/ttd/test',
      initialEntries: [`/ttd/test${path}`],
      getContext() {
        const context = new RouterContextProvider();
        context.set(queryClientContext, queryClient);
        context.set(appQueriesContext, queries);
        return context;
      },
    }),
  );

  return <RouterProvider router={router} />;
}
