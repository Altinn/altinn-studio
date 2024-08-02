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
import React from 'react';
import { usePreviewContext } from '../contexts/PreviewContext';
import { useLayoutContext } from '../contexts/LayoutContext';
import { Navigate, Route } from 'react-router-dom';
import { PageLayout } from 'app-development/layout/PageLayout';

const BASE_PATH = '/:org/:app';

const latestFrontendVersion = '4';
const isLatestFrontendVersion = (version: AppVersion): boolean =>
  version?.frontendVersion?.startsWith(latestFrontendVersion);

const UiEditor = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: version } = useAppVersionQuery(org, app);
  const { shouldReloadPreview, previewHasLoaded } = usePreviewContext();
  const { setSelectedLayoutSetName } = useLayoutContext();

  if (!version) return null;

  return isLatestFrontendVersion(version) ? (
    <UiEditorLatest
      shouldReloadPreview={shouldReloadPreview}
      previewHasLoaded={previewHasLoaded}
      onLayoutSetNameChange={(layoutSetName) => setSelectedLayoutSetName(layoutSetName)}
    />
  ) : (
    <UiEditorV3 />
  );
};

export const routes = (
  <Route path={BASE_PATH} element={<PageLayout />}>
    {/* Redirects from /:org/:app to child route /overview */}
    <Route path={RoutePaths.Root} element={<Navigate to={RoutePaths.Overview} />} />
    <Route path={RoutePaths.Overview} element={<Overview />} />
    <Route path={RoutePaths.UIEditor} element={<UiEditor />} />
    <Route path={RoutePaths.DataModel} element={<DataModellingContainer />} />
    <Route path={RoutePaths.Deploy} element={<DeployPage />} />
    <Route path={RoutePaths.Text} element={<TextEditor />} />
    <Route path={RoutePaths.ProcessEditor} element={<ProcessEditor />} />
  </Route>
);
