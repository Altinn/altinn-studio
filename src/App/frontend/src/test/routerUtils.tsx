import React from 'react';
import { createMemoryRouter, LoaderFunctionArgs, RouterContextProvider, RouterProvider } from 'react-router';

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

export function createLoaderArgs(partialArgs: Partial<LoaderFunctionArgs>): LoaderFunctionArgs {
  return {
    request: partialArgs.request ?? new Request('http://localhost/'),
    params: partialArgs.params ?? {},
    context: partialArgs.context ?? new RouterContextProvider(),
    unstable_pattern: partialArgs.unstable_pattern ?? '',
  };
}
