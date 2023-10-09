import { SubApp } from '../../packages/ux-editor/src/SubApp';
import { AccessControlContainer } from '../features/accessControl/containers/AccessControlContainer';
import { Administration } from '../features/administration/components/Administration';
import { TextEditor } from '../features/textEditor/TextEditor';
import DataModellingContainer from '../features/dataModelling/containers/DataModellingContainer';
import { TopBarMenu } from '../layout/AppBar/appBarConfig';
import { DeployPage } from '../features/appPublish/pages/deployPage';
import { ProcessEditor } from 'app-development/features/processEditor';

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

export const routes: IRoute[] = [
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
    activeSubHeaderSelection: TopBarMenu.None,
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
    activeSubHeaderSelection: TopBarMenu.Text,
    activeLeftMenuSelection: 'Tekster',
    path: '/:org/:app/text-editor',
    exact: true,
    menu: 'texts',
    subapp: TextEditor,
  },
  {
    activeSubHeaderSelection: TopBarMenu.ProcessEditor,
    activeLeftMenuSelection: '',
    path: '/:org/:app/process-editor',
    exact: true,
    menu: 'process-editor',
    subapp: ProcessEditor,
  },
];
