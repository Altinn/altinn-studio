import React from 'react';
import {
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from 'react-router-dom';
import { App } from 'admin/layout/App';
import { PageLayout } from 'admin/layout/PageLayout';
import { ADMIN_BASENAME } from 'app-shared/constants';
import { NotFoundPage } from 'admin/layout/NotFoundPage';
import {
  AppRouteErrorBoundary,
  NotFoundRouteErrorBoundary,
  RouteErrorBoundary,
} from './PageRouterErrorBoundary';
import { routerRoutes } from './routes';

const BASE_PATH = '/:org';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<App />} errorElement={<AppRouteErrorBoundary />}>
      <Route path={BASE_PATH} element={<PageLayout />} errorElement={<RouteErrorBoundary />}>
        {routerRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<route.page />}
            errorElement={<RouteErrorBoundary />}
          />
        ))}
        <Route path='*' element={<NotFoundPage />} errorElement={<NotFoundRouteErrorBoundary />} />
      </Route>
      <Route path='*' element={<NotFoundPage />} errorElement={<NotFoundRouteErrorBoundary />} />
    </Route>,
  ),
  {
    basename: ADMIN_BASENAME,
  },
);

/**
 * Displays the routes for app development pages
 */
export const PageRoutes = (): React.ReactElement => <RouterProvider router={router} />;
