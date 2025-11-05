import { Overview } from '../features/overview/components/Overview';
import { TextEditor } from '../features/textEditor/TextEditor';
import DataModellingContainer from '../features/dataModelling/containers/DataModellingContainer';
import { DeployPage } from '../features/appPublish/pages/DeployPage';
import { ProcessEditor } from 'app-development/features/processEditor';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { AppContentLibrary } from 'app-development/features/appContentLibrary';
import { UiEditor } from 'app-development/features/uiEditor/UiEditor';
import { AppSettings } from 'app-development/features/appSettings/AppSettings';
import { AiAssistant } from 'app-development/features/aiAssistant/AiAssistant';

interface RouterRoute {
  path: string;
  subapp: any;
}

export const routerRoutes: RouterRoute[] = [
  {
    path: RoutePaths.UIEditor + '/*',
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
  {
    path: RoutePaths.AppSettings,
    subapp: AppSettings,
  },
  {
    path: RoutePaths.AiAssistant,
    subapp: AiAssistant,
  },
];
