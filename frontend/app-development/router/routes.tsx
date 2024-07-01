// import { SubApp as UiEditorLatest } from '@altinn/ux-editor/SubApp';
// import { SubApp as UiEditorV3 } from '@altinn/ux-editor-v3/SubApp';
// import { Overview } from '../features/overview/components/Overview';
// import { TextEditor } from '../features/textEditor/TextEditor';
// import DataModellingContainer from '../features/dataModelling/containers/DataModellingContainer';
// import { DeployPage } from '../features/appPublish/pages/DeployPage';
// import { ProcessEditor } from 'app-development/features/processEditor';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import React, { Suspense } from 'react';
import { usePreviewContext } from '../contexts/PreviewContext';
import { useLayoutContext } from '../contexts/LayoutContext';
import { StudioCenter, StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';

const Overview = React.lazy(() => import('../features/overview/components/Overview'));
const DataModellingContainer = React.lazy(
  () => import('../features/dataModelling/containers/DataModellingContainer'),
);
const DeployPage = React.lazy(() => import('../features/appPublish/pages/DeployPage'));
const TextEditor = React.lazy(() => import('../features/textEditor/TextEditor'));
const ProcessEditor = React.lazy(() => import('../features/processEditor/ProcessEditor'));

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

const UiEditorSpinner = (): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioCenter style={{ height: '100vh' }}>
      <StudioSpinner spinnerTitle={t('ux_editor.loading_editor')} size='xlarge' />
    </StudioCenter>
  );
};

const UiEditor = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: version } = useAppVersionQuery(org, app);
  const { shouldReloadPreview, previewHasLoaded } = usePreviewContext();
  const { setSelectedLayoutSetName } = useLayoutContext();

  if (!version) return null;

  // Lazy load the correct version of the UX-editor based on the app version
  const UiEditorV3 = React.lazy(() => import('@altinn/ux-editor-v3/SubApp'));
  const UiEditorLatest = React.lazy(() => import('@altinn/ux-editor/SubApp'));

  return isLatestFrontendVersion(version) ? (
    <Suspense fallback={<UiEditorSpinner />}>
      <UiEditorLatest
        shouldReloadPreview={shouldReloadPreview}
        previewHasLoaded={previewHasLoaded}
        onLayoutSetNameChange={(layoutSetName) => setSelectedLayoutSetName(layoutSetName)}
      />
    </Suspense>
  ) : (
    <Suspense fallback={<UiEditorSpinner />}>
      <UiEditorV3 />
    </Suspense>
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
];
