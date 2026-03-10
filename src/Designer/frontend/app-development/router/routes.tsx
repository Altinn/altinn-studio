import React, { Suspense } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { PageLayout } from 'app-development/layout/PageLayout';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { NotFoundPage } from 'app-development/layout/NotFoundPage';
import { NotFoundRouteErrorBoundary, RouteErrorBoundary } from './PageRouterErrorBoundry';
import { GiteaRoutePaths } from '../enums/GiteaRoutePaths';
import { NavigateToLatestCommitInGitea } from '../features/navigateToLatestCommitInGitea';
import { StudioPageSpinner } from '@studio/components';

const Overview = React.lazy(() => import('app-development/features/overview/components/Overview'));
const DataModellingContainer = React.lazy(
  () => import('app-development/features/dataModelling/containers/DataModellingContainer'),
);
const DeployPage = React.lazy(() => import('app-development/features/appPublish/pages/DeployPage'));
const ProcessEditor = React.lazy(
  () => import('app-development/features/processEditor/ProcessEditor'),
);
const AppContentLibrary = React.lazy(
  () => import('app-development/features/appContentLibrary/AppContentLibrary'),
);
const AppSettings = React.lazy(() => import('app-development/features/appSettings/AppSettings'));
const TextEditor = React.lazy(() => import('app-development/features/textEditor/TextEditor'));
const AiAssistant = React.lazy(() => import('app-development/features/aiAssistant/AiAssistant'));
const UiEditor = React.lazy(() => import('app-development/features/uiEditor/UiEditor'));

const BASE_PATH = '/:org/:app';

const suspense = (Component: React.LazyExoticComponent<() => React.ReactElement>) => (
  <Suspense fallback={<StudioPageSpinner spinnerTitle='' />}>
    <Component />
  </Suspense>
);

export const routes = (
  <Route path={BASE_PATH} element={<PageLayout />} errorElement={<RouteErrorBoundary />}>
    <Route
      path={RoutePaths.Root}
      element={<Navigate to={RoutePaths.Overview} />}
      errorElement={<RouteErrorBoundary />}
    />
    <Route
      path={RoutePaths.UIEditor + '/*'}
      element={suspense(UiEditor)}
      errorElement={<RouteErrorBoundary />}
    />
    <Route
      path={RoutePaths.Overview}
      element={suspense(Overview)}
      errorElement={<RouteErrorBoundary />}
    />
    <Route
      path={RoutePaths.DataModel}
      element={suspense(DataModellingContainer)}
      errorElement={<RouteErrorBoundary />}
    />
    <Route
      path={RoutePaths.Deploy}
      element={suspense(DeployPage)}
      errorElement={<RouteErrorBoundary />}
    />
    <Route
      path={RoutePaths.Text}
      element={suspense(TextEditor)}
      errorElement={<RouteErrorBoundary />}
    />
    <Route
      path={RoutePaths.ProcessEditor}
      element={suspense(ProcessEditor)}
      errorElement={<RouteErrorBoundary />}
    />
    <Route
      path={RoutePaths.ContentLibrary + '/:elementType?'}
      element={suspense(AppContentLibrary)}
      errorElement={<RouteErrorBoundary />}
    />
    <Route
      path={RoutePaths.AppSettings}
      element={suspense(AppSettings)}
      errorElement={<RouteErrorBoundary />}
    />
    <Route
      path={RoutePaths.AiAssistant}
      element={suspense(AiAssistant)}
      errorElement={<RouteErrorBoundary />}
    />

    <Route
      path={GiteaRoutePaths.LatestCommit}
      element={<NavigateToLatestCommitInGitea />}
      errorElement={<RouteErrorBoundary />}
    />
    <Route path='*' element={<NotFoundPage />} errorElement={<NotFoundRouteErrorBoundary />} />
  </Route>
);
