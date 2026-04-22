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
import { ApiKeys } from '../features/user/pages/ApiKeys/ApiKeys';
import { BotAccounts } from '../features/orgs/pages/BotAccounts/BotAccounts';
import { ContactPoints } from '../features/orgs/pages/ContactPoints/ContactPoints';
import { NotFound } from '../components/NotFound/NotFound';
import { PageLayout } from '../layouts/PageLayout/PageLayout';
import { UserPageLayout } from '../layouts/UserPageLayout/UserPageLayout';
import { OrgPageLayout } from '../layouts/OrgPageLayout/OrgPageLayout';
import { IndexRedirect } from '../components/IndexRedirect/IndexRedirect';
import { OwnerIndexRedirect } from '../components/OwnerIndexRedirect/OwnerIndexRedirect';
import { RoutePaths } from './RoutePaths';
import { RoutePaths as OrgsRoutePaths } from '../features/orgs/routes/RoutePaths';
import { RoutePaths as UserRoutePaths } from '../features/user/routes/RoutePaths';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<PageLayout />} errorElement={<AppRouteErrorBoundary />}>
      <Route index element={<IndexRedirect />} />
      <Route path={RoutePaths.Owner} errorElement={<RouteErrorBoundary />}>
        <Route index element={<OwnerIndexRedirect />} />
        <Route element={<UserPageLayout />} errorElement={<RouteErrorBoundary />}>
          <Route
            path={UserRoutePaths.ApiKeys}
            element={<ApiKeys />}
            errorElement={<RouteErrorBoundary />}
          />
        </Route>
        <Route element={<OrgPageLayout />} errorElement={<RouteErrorBoundary />}>
          <Route
            path={OrgsRoutePaths.BotAccounts}
            element={<BotAccounts />}
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path={OrgsRoutePaths.ContactPoints}
            element={<ContactPoints />}
            errorElement={<RouteErrorBoundary />}
          />
        </Route>
      </Route>
      <Route path='*' element={<NotFound />} errorElement={<NotFoundRouteErrorBoundary />} />
    </Route>,
  ),
  {
    basename: SETTINGS_BASENAME,
  },
);

export const PageRoutes = (): React.ReactElement => <RouterProvider router={router} />;
