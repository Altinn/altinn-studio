import { SubApp } from '../../packages/ux-editor/src/SubApp';
import { AccessControlContainer } from '../features/accessControl/containers/AccessControlContainer';
import { Administration } from '../features/administration/components/Administration';
import { TextEditor } from '../features/textEditor';
import DeployPage from '../features/appPublish/pages/deployPage';
import HandleMergeConflictContainerComponent from '../features/handleMergeConflict/HandleMergeConflictContainer';
import DataModellingContainer from '../features/dataModelling/containers/DataModellingContainer';
import { TopBarMenu } from '../layout/AppBar/appBarConfig';

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
  path: string;
  exact: boolean;
  activeSubHeaderSelection: TopBarMenu;
  menu: string;
  subapp: any;
  activeLeftMenuSelection?: string;
  props?: IRouteProps;
}

const routes: IRoute[] = [
  {
    path: '/:org/:app/ui-editor',
    exact: true,
    activeSubHeaderSelection: TopBarMenu.Create,
    activeLeftMenuSelection: 'UI-Editor',
    menu: 'create',
    subapp: SubApp,
  },
  {
    path: '/:org/:app',
    exact: true,
    activeSubHeaderSelection: TopBarMenu.About,
    activeLeftMenuSelection: 'Om appen',
    menu: 'about',
    subapp: Administration,
  },
  {
    path: '/:org/:app/datamodel',
    exact: true,
    activeSubHeaderSelection: TopBarMenu.Datamodel,
    activeLeftMenuSelection: '',
    menu: 'datamodel',
    subapp: DataModellingContainer,
  },
  {
    path: '/:org/:app/accesscontrol',
    exact: true,
    activeSubHeaderSelection: TopBarMenu.Create,
    activeLeftMenuSelection: 'Access-Controll',
    menu: 'create',
    subapp: AccessControlContainer,
    props: {
      imageSource: '../../designer/img/illustration-help-circle.svg',
    },
  },
  {
    path: '/:org/:app/deploy',
    exact: true,
    activeSubHeaderSelection: TopBarMenu.Deploy,
    activeLeftMenuSelection: '',
    menu: 'deploy',
    subapp: DeployPage,
  },
  {
    path: '/:org/:app/mergeconflict',
    exact: true,
    activeSubHeaderSelection: TopBarMenu.None,
    activeLeftMenuSelection: 'Mergekonflikt',
    menu: 'create',
    subapp: HandleMergeConflictContainerComponent,
    props: {
      headerTextKey: 'shared.wip_title',
      subtext1TextKey: 'shared.wip_subtext_1',
      subtext2TextKey: 'shared.wip_subtext_2',
      linkTextKey: 'shared.wip_link_text',
      urlKey: 'shared.wip_link_github_url',
      imageSource: '../../designer/img/illustration-help-circle.svg',
      shadow: true,
    },
  },
  {
    activeSubHeaderSelection: TopBarMenu.Text,
    activeLeftMenuSelection: 'Tekster',
    path: '/:org/:app/text-editor',
    exact: true,
    menu: 'texts',
    subapp: TextEditor,
  },
];

export default routes;
