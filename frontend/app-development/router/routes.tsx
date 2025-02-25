import { SubApp as UiEditorLatest } from '@altinn/ux-editor/SubApp';
import { SubApp as UiEditorV3 } from '@altinn/ux-editor-v3/SubApp';
import { Overview } from '../features/overview/components/Overview';
import { TextEditor } from '../features/textEditor/TextEditor';
import DataModellingContainer from '../features/dataModelling/containers/DataModellingContainer';
import { DeployPage } from '../features/appPublish/pages/DeployPage';
import { ProcessEditor } from 'app-development/features/processEditor';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import React, { useEffect } from 'react';
import { usePreviewContext } from '../contexts/PreviewContext';
import { useLayoutContext } from '../contexts/LayoutContext';
import { StudioPageSpinner, StudioSpinner, useLocalStorage } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { AppContentLibrary } from 'app-development/features/appContentLibrary';
import { FormDesignerNavigation } from '@altinn/ux-editor/containers/FormDesignNavigation';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { useAppConfigQuery } from 'app-development/hooks/queries';
import { toast } from 'react-toastify';

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

const UiEditor = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const { data: version, isPending: fetchingVersionIsPending } = useAppVersionQuery(org, app);
  const { shouldReloadPreview, previewHasLoaded } = usePreviewContext();
  const { setSelectedLayoutSetName } = useLayoutContext();
  const [selectedFormLayoutSetName] = useLocalStorage<string>('layoutSet/' + app);
  const isTaskNavigationEnabled = shouldDisplayFeature(FeatureFlag.TaskNavigation);

  const {
    data: appConfigData,
    isPending,
    isError,
  } = useAppConfigQuery(org, app, {
    hideDefaultError: true,
  });

  useEffect(() => {
    if (isError) {
      toast.error(t('overview.fetch_title_error_message'));
    }
  }, [isError, t]);

  if (isPending) {
    return <StudioSpinner showSpinnerTitle={false} spinnerTitle={t('overview.header_loading')} />;
  }

  if (fetchingVersionIsPending) {
    return <StudioPageSpinner spinnerTitle={t('ux_editor.loading_page')} />;
  }

  if (!version) return null;

  return isLatestFrontendVersion(version) ? (
    isTaskNavigationEnabled && !selectedFormLayoutSetName ? (
      <FormDesignerNavigation appConfig={appConfigData?.serviceName} />
    ) : (
      <UiEditorLatest
        shouldReloadPreview={shouldReloadPreview}
        previewHasLoaded={previewHasLoaded}
        onLayoutSetNameChange={(layoutSetName) => setSelectedLayoutSetName(layoutSetName)}
      />
    )
  ) : (
    <UiEditorV3 />
  );
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
