import React from 'react';
import { RoutePaths } from 'app-development/enums/RoutePaths';
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
