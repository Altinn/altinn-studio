import React from 'react';
import {
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from 'react-router-dom';
import { SETTINGS_BASENAME } from 'app-shared/constants';
import {
  AppRouteErrorBoundary,
  NotFoundRouteErrorBoundary,
  RouteErrorBoundary,
} from './PageRouterErrorBoundary';
import { routerRoutes } from './routes';
import { NotFound } from '../pages/NotFound/NotFound';
import { PageLayout } from '../pages/PageLayout';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<PageLayout />} errorElement={<AppRouteErrorBoundary />}>
      {routerRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={<route.page />}
          errorElement={<RouteErrorBoundary />}
        />
      ))}
      <Route path='*' element={<NotFound />} errorElement={<NotFoundRouteErrorBoundary />} />
    </Route>,
  ),
  {
    basename: SETTINGS_BASENAME,
  },
);

export const PageRoutes = (): React.ReactElement => <RouterProvider router={router} />;
