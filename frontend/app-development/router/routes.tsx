import { SubApp } from '../../packages/ux-editor/src/SubApp';
import { Administration } from '../features/administration/components/Administration';
import { LegacyAdministration } from '../features/administration/components/LegacyAdministration';
import { Contact } from '../features/administration/components/Contact';
import { TextEditor } from '../features/textEditor/TextEditor';
import DataModellingContainer from '../features/dataModelling/containers/DataModellingContainer';
import { DeployPage } from '../features/appPublish/pages/deployPage';
import { ProcessEditor } from 'app-development/features/processEditor';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { RoutePaths } from 'app-development/enums/RoutePaths';

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

export const routerRoutes: RouterRoute[] = [
  {
    path: RoutePaths.UIEditor,
    subapp: SubApp,
  },
  {
    path: RoutePaths.Overview,
    subapp: shouldDisplayFeature('newAdministration') ? Administration : LegacyAdministration,
  },
  {
    path: RoutePaths.Contact,
    subapp: Contact,
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
