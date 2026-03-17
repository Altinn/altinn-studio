import { lazy } from 'react';
import { RoutePaths } from 'app-development/enums/RoutePaths';
const Overview = lazy(() => import('app-development/features/overview/components/Overview'));
const DataModellingContainer = lazy(
  () => import('app-development/features/dataModelling/containers/DataModellingContainer'),
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

interface RouterRoute {
  path: string;
  subapp: any;
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
    subapp: DataModellingContainer,
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
];
