import React from 'react';
import {
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from 'react-router-dom';
import { ORG_SETTINGS_BASENAME } from 'app-shared/constants';
import {
  AppRouteErrorBoundary,
  NotFoundRouteErrorBoundary,
  RouteErrorBoundary,
} from './PageRouterErrorBoundary';
import { routerRoutes } from './routes';
import { NotFound } from '../pages/NotFound/NotFound';
import { AppLayout } from '../pages/AppLayout/AppLayout';
import { PageLayout } from '../pages/PageLayout';

const BASE_PATH = '/:org';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppLayout />}>
      <Route path={BASE_PATH} element={<PageLayout />} errorElement={<AppRouteErrorBoundary />}>
        {routerRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<route.page />}
            errorElement={<RouteErrorBoundary />}
          />
        ))}
        <Route path='*' element={<NotFound />} errorElement={<NotFoundRouteErrorBoundary />} />
      </Route>
      <Route path='*' element={<NotFound />} errorElement={<NotFoundRouteErrorBoundary />} />
    </Route>,
  ),
  {
    basename: ORG_SETTINGS_BASENAME,
  },
);

export const PageRoutes = (): React.ReactElement => <RouterProvider router={router} />;
