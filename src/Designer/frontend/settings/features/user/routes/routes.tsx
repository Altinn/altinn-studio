import { Navigate, Route } from 'react-router-dom';
import { RoutePaths } from './RoutePaths';
import { PageLayout } from '../layout/PageLayout';
import { RouteErrorBoundary } from '../../../routes/PageRouterErrorBoundary';
import { ApiKeys } from '../pages/ApiKeys/ApiKeys';

export const routes = (
  <Route path={RoutePaths.User} errorElement={<RouteErrorBoundary />}>
    <Route index element={<Navigate to={RoutePaths.ApiKeys} replace />} />
    <Route element={<PageLayout />} errorElement={<RouteErrorBoundary />}>
      <Route
        path={RoutePaths.ApiKeys}
        element={<ApiKeys />}
        errorElement={<RouteErrorBoundary />}
      />
    </Route>
  </Route>
);
