import { SubApp as UiEditorLatest } from '@altinn/ux-editor/SubApp';
import { SubApp as UiEditorV3 } from '@altinn/ux-editor-v3/SubApp';
import { Overview } from '../features/overview/components/Overview';
import { TextEditor } from '../features/textEditor/TextEditor';
import DataModellingContainer from '../features/dataModelling/containers/DataModellingContainer';
import { DeployPage } from '../features/appPublish/pages/DeployPage';
import { ProcessEditor } from 'app-development/features/processEditor';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import React from 'react';

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
  const { org, app } = useStudioUrlParams();
  const { data: version } = useAppVersionQuery(org, app);
  if (!version) return null;
  return isLatestFrontendVersion(version) ? <UiEditorLatest /> : <UiEditorV3 />;
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
