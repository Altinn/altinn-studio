import uieditorApp from '../../ux-editor/SubApp';
import TextEditorApp from '../features/text-editor/TextEditorApp';
import AccessControlContainer from '../features/accessControl/containers/AccessControlContainer';
import { Administration } from '../features/administration/components/Administration';
import DeployPage from '../features/appPublish/pages/deployPage';
// eslint-disable-next-line import/no-named-as-default
import HandleMergeConflictContainer from '../features/handleMergeConflict/HandleMergeConflictContainer';
import { IFrame } from '../features/iFrame/iFrameComponent';
import DataModellingContainer from '../features/dataModelling/containers/DataModellingContainer';

export interface IRouteProps {
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

export interface IRoute {
  path: string;
  exact: boolean;
  activeSubHeaderSelection: string;
  menu: string;
  subapp: any;
  activeLeftMenuSelection?: string;
  props?: IRouteProps;
}

const routes: IRoute[] = [
  {
    path: '/ui-editor',
    exact: true,
    activeSubHeaderSelection: 'Lage',
    activeLeftMenuSelection: 'UI-Editor',
    menu: 'create',
    subapp: uieditorApp,
  },
  {
    path: '/texts',
    exact: true,
    activeSubHeaderSelection: 'Språk',
    activeLeftMenuSelection: 'Tekster',
    menu: 'language',
    subapp: IFrame,
    props: {
      headerTextKey: 'shared.wip_title',
      subtext1TextKey: 'shared.wip_subtext_1',
      subtext2TextKey: 'shared.wip_subtext_2',
      linkTextKey: 'shared.wip_link_text',
      urlKey: 'shared.wip_link_github_url',
      imageSource: '../../designer/img/illustration-help-circle.svg',
      shadow: true,
      iframeEndingUrl: 'Text',
    },
  },
  {
    path: '/texts2',
    exact: true,
    activeSubHeaderSelection: 'SpråkNy',
    activeLeftMenuSelection: 'TeksterNy',
    menu: 'language',
    subapp: TextEditorApp,
  },
  {
    path: '/about',
    exact: true,
    activeSubHeaderSelection: 'Om',
    activeLeftMenuSelection: 'Om appen',
    menu: 'about',
    subapp: Administration,
  },
  {
    path: '/datamodel',
    exact: true,
    activeSubHeaderSelection: 'Lage',
    activeLeftMenuSelection: 'Datamodell',
    menu: 'create',
    subapp: IFrame,
    props: {
      headerTextKey: 'shared.wip_title',
      subtext1TextKey: 'shared.wip_subtext_1',
      subtext2TextKey: 'shared.wip_subtext_2',
      linkTextKey: 'shared.wip_link_text',
      urlKey: 'shared.wip_link_github_url',
      imageSource: '../../designer/img/illustration-help-circle.svg',
      shadow: true,
      iframeEndingUrl: 'Model',
    },
  },
  {
    path: '/datamodelling',
    exact: true,
    activeSubHeaderSelection: 'Lage',
    activeLeftMenuSelection: 'Data-Modelling',
    menu: 'create',
    subapp: DataModellingContainer,
  },
  {
    path: '/accesscontrol',
    exact: true,
    activeSubHeaderSelection: 'Lage',
    activeLeftMenuSelection: 'Access-Controll',
    menu: 'create',
    subapp: AccessControlContainer,
    props: {
      imageSource: '../../designer/img/illustration-help-circle.svg',
    },
  },
  {
    path: '/deploy',
    exact: true,
    activeSubHeaderSelection: 'Deploy',
    activeLeftMenuSelection: '',
    menu: 'deploy',
    subapp: DeployPage,
  },
  {
    path: '/mergeconflict',
    exact: true,
    activeSubHeaderSelection: '',
    activeLeftMenuSelection: 'Mergekonflikt',
    menu: 'create',
    subapp: HandleMergeConflictContainer,
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
];

export default routes;
