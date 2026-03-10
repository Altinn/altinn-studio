import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import {
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from 'react-router-dom';
import { NotFoundPage } from './NotFoundPage';

type RoutesProps = {
  basename: string;
  routes: ReactNode;
};

export const Routes = ({ basename, routes }: RoutesProps) => {
  const router = useMemo(
    () =>
      createBrowserRouter(
        createRoutesFromElements(
          <Route path='/'>
            {routes}
            <Route path='*' element={<NotFoundPage />} />
          </Route>,
        ),
        { basename },
      ),
    [basename, routes],
  );

  return <RouterProvider router={router} />;
};
