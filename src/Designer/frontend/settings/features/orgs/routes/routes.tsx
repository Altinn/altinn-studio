import { Navigate, Route } from 'react-router-dom';
import { RoutePaths } from './RoutePaths';
import { PageLayout } from '../layout/PageLayout';
import { RouteErrorBoundary } from '../../../routes/PageRouterErrorBoundary';
import { BotAccounts } from '../pages/BotAccounts/BotAccounts';
import { ContactPoints } from '../pages/ContactPoints/ContactPoints';

export const routes = (
  <Route path={RoutePaths.Org} errorElement={<RouteErrorBoundary />}>
    <Route index element={<Navigate to={RoutePaths.BotAccounts} replace />} />
    <Route element={<PageLayout />} errorElement={<RouteErrorBoundary />}>
      <Route
        path={RoutePaths.BotAccounts}
        element={<BotAccounts />}
        errorElement={<RouteErrorBoundary />}
      />
      <Route
        path={RoutePaths.ContactPoints}
        element={<ContactPoints />}
        errorElement={<RouteErrorBoundary />}
      />
    </Route>
  </Route>
);
