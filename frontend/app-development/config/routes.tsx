import { SubApp } from '../../packages/ux-editor/src/SubApp';
import { Administration } from '../features/administration/components/Administration';
import { LegacyAdministration } from '../features/administration/components/LegacyAdministration';
import { TextEditor } from '../features/textEditor/TextEditor';
import DataModellingContainer from '../features/dataModelling/containers/DataModellingContainer';
import { TopBarMenu } from '../layout/AppBar/appBarConfig';
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

interface IRoute {
  path: RoutePaths;
  exact: boolean;
  activeSubHeaderSelection: TopBarMenu;
  subapp: any;
  activeLeftMenuSelection?: string;
  props?: IRouteProps;
}

export const routes: IRoute[] = [
  {
    path: RoutePaths.UIEditor,
    exact: true,
    activeSubHeaderSelection: TopBarMenu.Create,
    activeLeftMenuSelection: 'UI-Editor',
    subapp: SubApp,
  },
  {
    path: RoutePaths.About,
    exact: true,
    activeSubHeaderSelection: TopBarMenu.About,
    activeLeftMenuSelection: 'Om appen',
    subapp: shouldDisplayFeature('newAdministration') ? Administration : LegacyAdministration,
  },
  {
    path: RoutePaths.DataModel,
    exact: true,
    activeSubHeaderSelection: TopBarMenu.Datamodel,
    activeLeftMenuSelection: '',
    subapp: DataModellingContainer,
  },
  {
    path: RoutePaths.Deploy,
    exact: true,
    activeSubHeaderSelection: TopBarMenu.Deploy,
    activeLeftMenuSelection: '',
    subapp: DeployPage,
  },
  {
    activeSubHeaderSelection: TopBarMenu.Text,
    activeLeftMenuSelection: 'Tekster',
    path: RoutePaths.Text,
    exact: true,
    subapp: TextEditor,
  },
  {
    activeSubHeaderSelection: TopBarMenu.ProcessEditor,
    activeLeftMenuSelection: '',
    path: RoutePaths.ProcessEditor,
    exact: true,
    subapp: ProcessEditor,
  },
];
