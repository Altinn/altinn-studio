import React from 'react';
import {
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from 'react-router-dom';
import { PageLayout } from 'admin/layouts/PageLayout/PageLayout';
import { OrgPageLayout } from 'admin/layouts/OrgPageLayout/OrgPageLayout';
import { PageLayout as AppsLayout } from 'admin/features/apps/layout/PageLayout';
import { ADMIN_BASENAME } from 'app-shared/constants';
import { NotFoundPage } from 'admin/pages/NotFoundPage/NotFoundPage';
import { NoOrgSelected } from 'admin/pages/NoOrgSelected/NoOrgSelected';
import {
  AppRouteErrorBoundary,
  NotFoundRouteErrorBoundary,
  RouteErrorBoundary,
} from './PageRouterErrorBoundary';
import { routerRoutes } from './routes';

const BASE_PATH = '/:org';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<PageLayout />} errorElement={<AppRouteErrorBoundary />}>
      <Route index element={<NoOrgSelected />} />
      <Route path={BASE_PATH} element={<OrgPageLayout />} errorElement={<RouteErrorBoundary />}>
        <Route element={<AppsLayout />} errorElement={<RouteErrorBoundary />}>
          {routerRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<route.page />}
              errorElement={<RouteErrorBoundary />}
            />
          ))}
        </Route>
        <Route path='*' element={<NotFoundPage />} errorElement={<NotFoundRouteErrorBoundary />} />
      </Route>
    </Route>,
  ),
  {
    basename: ADMIN_BASENAME,
  },
);

export const PageRoutes = (): React.ReactElement => <RouterProvider router={router} />;
