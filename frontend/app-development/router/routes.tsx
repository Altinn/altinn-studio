import { SubApp as UiEditorLatest } from '../../packages/ux-editor/src/SubApp';
import { SubApp as UiEditorV3 } from '../../packages/ux-editor-v3/src/SubApp';
import { Overview } from '../features/overview/components/Overview';
import { TextEditor } from '../features/textEditor/TextEditor';
import DataModellingContainer from '../features/dataModelling/containers/DataModellingContainer';
import { DeployPage } from '../features/appPublish/pages/deployPage';
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
  const { data } = useAppVersionQuery(org, app);
  //return isLatestFrontendVersion(data) ? <UiEditorLatest /> : <UiEditorV3 />;
  return <UiEditorLatest />;
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
    path: RoutePaths.Datamodel,
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
