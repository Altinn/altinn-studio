import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { scan } from 'react-scan';

import { setAutoFreeze } from 'immer';
import { Api } from 'nextsrc/nextpoc/app/api';
import { AppLayout } from 'nextsrc/nextpoc/app/App/AppLayout/AppLayout';
import { initialLoader } from 'nextsrc/nextpoc/app/App/AppLayout/initialLoader';
import { Instance } from 'nextsrc/nextpoc/pages/Instance/Instance';
import { instanceLoader } from 'nextsrc/nextpoc/pages/Instance/instanceLoader';
import { Page } from 'nextsrc/nextpoc/pages/Page/Page';
import { Task } from 'nextsrc/nextpoc/pages/Task/Task';

setAutoFreeze(false);

const { org, app } = window;
const origin = window.location.origin;

console.log('origin', origin);

export const ORG = org;
export const APP = app;

export const API_CLIENT = new Api({
  baseUrl: `${origin}`,
});

const router = createBrowserRouter([
  {
    path: '/:org/:app/',
    loader: initialLoader,
    element: <AppLayout />,
    children: [
      {
        loader: instanceLoader,
        path: 'instance/:partyId/:instanceGuid',
        element: <Instance />,
        children: [
          {
            path: ':taskId',
            element: <Task />,
            children: [
              {
                path: ':pageId',
                element: <Page />,
              },
            ],
          },
        ],
      },
    ],
  },
]);

export const App = () => {
  useEffect(() => {
    // Make sure to run react-scan only after hydration
    scan({
      enabled: true,
    });
  }, []);

  return <RouterProvider router={router} />;
};
