import React, { Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { PageLayout } from 'app-development/layout/PageLayout';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { createWorkspaceRoutes } from 'app-shared/routes/createWorkspaceRoutes';
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

const routeDefinitions = [
  { path: RoutePaths.Root, element: <Navigate to={RoutePaths.Overview} /> },
  { path: RoutePaths.UIEditor + '/*', element: suspense(UiEditor) },
  { path: RoutePaths.Overview, element: suspense(Overview) },
  { path: RoutePaths.DataModel, element: suspense(DataModellingContainer) },
  { path: RoutePaths.Deploy, element: suspense(DeployPage) },
  { path: RoutePaths.Text, element: suspense(TextEditor) },
  { path: RoutePaths.ProcessEditor, element: suspense(ProcessEditor) },
  { path: RoutePaths.ContentLibrary + '/:elementType?', element: suspense(AppContentLibrary) },
  { path: RoutePaths.AppSettings, element: suspense(AppSettings) },
  { path: RoutePaths.AiAssistant, element: suspense(AiAssistant) },
  { path: GiteaRoutePaths.LatestCommit, element: <NavigateToLatestCommitInGitea /> },
];

export const routes = createWorkspaceRoutes({
  layoutElement: <PageLayout />,
  basePath: BASE_PATH,
  routeDefinitions,
});
