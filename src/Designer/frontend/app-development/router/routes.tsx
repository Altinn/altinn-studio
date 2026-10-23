import { lazy } from 'react';
import { matchPath } from 'react-router-dom';
import { RoutePaths } from 'app-development/enums/RoutePaths';
const Overview = lazy(() => import('app-development/features/overview/components/Overview'));
const DataModelingContainer = lazy(
  () => import('app-development/features/dataModelling/containers/DataModelingContainer'),
);
const DeployPage = lazy(() => import('app-development/features/appPublish/pages/DeployPage'));
const ProcessEditor = lazy(() => import('app-development/features/processEditor/ProcessEditor'));
const AppContentLibrary = lazy(
  () => import('app-development/features/appContentLibrary/AppContentLibrary'),
);
const AppSettings = lazy(() => import('app-development/features/appSettings/AppSettings'));
const TextEditor = lazy(() => import('app-development/features/textEditor/TextEditor'));
const AiAssistant = lazy(() => import('app-development/features/aiAssistant/AiAssistant'));
const UiEditor = lazy(() => import('app-development/features/uiEditor/UiEditor'));
const AppUpgrade = lazy(() => import('app-development/features/appUpgrade/AppUpgrade'));

interface RouterRoute {
  path: string;
  subapp: any;
  /** Hides the page header and navigation so the page fills the whole window. */
  focusMode?: boolean;
}

export const routerRoutes: RouterRoute[] = [
  {
    path: RoutePaths.UIEditor + '/*',
    subapp: UiEditor,
  },
  {
    path: RoutePaths.Overview,
    subapp: Overview,
  },
  {
    path: RoutePaths.DataModel,
    subapp: DataModelingContainer,
  },
  {
    path: RoutePaths.Deploy,
    subapp: DeployPage,
  },
  {
    path: RoutePaths.Text,
    subapp: TextEditor,
  },
  {
    path: RoutePaths.ProcessEditor,
    subapp: ProcessEditor,
  },
  {
    path: RoutePaths.ContentLibrary + '/:elementType?',
    subapp: AppContentLibrary,
  },
  {
    path: RoutePaths.AppSettings,
    subapp: AppSettings,
  },
  {
    path: RoutePaths.AiAssistant,
    subapp: AiAssistant,
  },
  {
    path: RoutePaths.AppUpgrade,
    subapp: AppUpgrade,
    focusMode: true,
  },
];

export const isFocusModeRoute = (pathname: string): boolean =>
  routerRoutes.some(
    (route) => route.focusMode && matchPath({ path: `/:org/:app/${route.path}` }, pathname),
  );
