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
import { RoutePaths } from './RoutePaths';
import { NotFound } from 'admin/components/NotFound/NotFound';
import {
  AppRouteErrorBoundary,
  NotFoundRouteErrorBoundary,
  RouteErrorBoundary,
} from './PageRouterErrorBoundary';
import { routerRoutes } from './routes';
import { IndexRedirect } from 'admin/components/IndexRedirect/IndexRedirect';
import { PlatformLayout } from 'admin/features/platform/layout/PlatformLayout';
import { ServiceOwners } from 'admin/features/platform/pages/serviceOwners/ServiceOwners';
import { AllApps } from 'admin/features/platform/pages/allApps/AllApps';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<PageLayout />} errorElement={<AppRouteErrorBoundary />}>
      <Route index element={<IndexRedirect />} />
      <Route element={<AppsLayout />} errorElement={<RouteErrorBoundary />}>
        <Route
          path={RoutePaths.Platform}
          element={<PlatformLayout />}
          errorElement={<RouteErrorBoundary />}
        >
          <Route index element={<ServiceOwners />} />
          <Route path={RoutePaths.PlatformApps} element={<AllApps />} />
        </Route>
      </Route>
      <Route
        path={RoutePaths.Owner}
        element={<OrgPageLayout />}
        errorElement={<RouteErrorBoundary />}
      >
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
        <Route path='*' element={<NotFound />} errorElement={<NotFoundRouteErrorBoundary />} />
      </Route>
    </Route>,
  ),
  {
    basename: ADMIN_BASENAME,
  },
);

export const PageRoutes = (): React.ReactElement => <RouterProvider router={router} />;
