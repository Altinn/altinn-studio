import React from 'react';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import { usePreviewContext } from '../contexts/PreviewContext';
import { useLayoutContext } from '../contexts/LayoutContext';
import { StudioPageSpinner, useLocalStorage } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { FormDesignerNavigation } from '@altinn/ux-editor/containers/FormDesignNavigation';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

const SubApp = React.lazy(() => import('@altinn/ux-editor/SubApp'));
const V3SubApp = React.lazy(() => import('@altinn/ux-editor-v3/SubApp'));
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

interface IRouteProps {
  headerTextKey?: string;
  subtext1TextKey?: string;
  subtext2TextKey?: string;
  linkTextKey?: string;
  urlKey?: string;
  imageSource?: string;
  shadow?: boolean;
  iframeEndingUrl?: string;
  filePath?: string;
  language?: any;
}

interface RouterRoute {
  path: RoutePaths;
  subapp: any;
  props?: IRouteProps;
}

const latestFrontendVersion = '4';
const isLatestFrontendVersion = (version: AppVersion): boolean =>
  version?.frontendVersion?.startsWith(latestFrontendVersion);

export const UiEditor = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const { data: version, isPending: fetchingVersionIsPending } = useAppVersionQuery(org, app);
  const { shouldReloadPreview, previewHasLoaded } = usePreviewContext();
  const { setSelectedLayoutSetName } = useLayoutContext();
  const [selectedFormLayoutSetName] = useLocalStorage<string>('layoutSet/' + app);
  const isTaskNavigationEnabled = shouldDisplayFeature(FeatureFlag.TaskNavigation);

  if (fetchingVersionIsPending) {
    return <StudioPageSpinner spinnerTitle={t('ux_editor.loading_page')} />;
  }

  if (!version) return null;

  const renderUiEditorContent = () => {
    if (isTaskNavigationEnabled && !selectedFormLayoutSetName) {
      return <FormDesignerNavigation />;
    }

    const handleLayoutSetNameChange = (layoutSetName: string) => {
      setSelectedLayoutSetName(layoutSetName);
    };

    return (
      <SubApp
        shouldReloadPreview={shouldReloadPreview}
        previewHasLoaded={previewHasLoaded}
        onLayoutSetNameChange={handleLayoutSetNameChange}
      />
    );
  };

  return isLatestFrontendVersion(version) ? renderUiEditorContent() : <V3SubApp />;
};

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
