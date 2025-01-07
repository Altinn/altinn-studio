import React from 'react';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { usePreviewContext } from '../contexts/PreviewContext';
import { useLayoutContext } from '../contexts/LayoutContext';
import { StudioPageSpinner, useLocalStorage } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { FormDesignerNavigation } from '@altinn/ux-editor/containers/FormDesignNavigation';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

const UiEditor = React.lazy(() => import('app-development/features/uiEditor/UiEditor'));
const ProcessEditor = React.lazy(
  () => import('app-development/features/processEditor/ProcessEditor'),
);
const TextEditor = React.lazy(() => import('app-development/features/textEditor/TextEditor'));
const Overview = React.lazy(() => import('app-development/features/overview/components/Overview'));
const DataModellingContainer = React.lazy(
  () => import('app-development/features/dataModelling/containers/DataModellingContainer'),
);
const DeployPage = React.lazy(() => import('app-development/features/appPublish/pages/DeployPage'));
const AppContentLibrary = React.lazy(
  () => import('app-development/features/appContentLibrary/AppContentLibrary'),
);

interface RouterRoute {
  path: RoutePaths;
  subapp: any;
}

export const routerRoutes: RouterRoute[] = [
  {
    path: RoutePaths.UIEditor,
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
    path: RoutePaths.ContentLibrary,
    subapp: AppContentLibrary,
  },
];
