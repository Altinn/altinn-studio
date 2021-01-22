import * as React from 'react';
import { hot } from 'react-hot-loader';
import postMessages from 'app-shared/utils/postMessages';
import { Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import appDataActionDispatcher from './actions/appDataActions/appDataActionDispatcher';
import formDesignerActionDispatchers from './actions/formDesignerActions/formDesignerActionDispatcher';
import manageServiceConfigurationActionDispatcher from './actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';
import ThirdPartyComponentsActionDispatcher from './actions/thirdPartyComponentsActions/thirdPartyComponentsActionDispatcher';
import { ErrorMessageComponent } from './components/message/ErrorMessageComponent';
import FormDesigner from './containers/FormDesigner';
import { loadTextResources } from './features/appData/textResources/textResourcesSlice';
import { fetchWidgets, fetchWidgetSettings } from './features/widgets/widgetsSlice';

export interface IAppComponentProps { }

export interface IAppCompoentState { }

/**
 * This is the main React component responsible for controlling
 * the mode of the application and loading initial data for the
 * application
 */
export function App() {
  const dispatch = useDispatch();

  const fetchFiles = () => {
    const { org, app } = window as Window as IAltinnWindow;
    const appId = `${org}/${app}`;

    // ALTINN STUDIO
    // Editor
    // Set design mode to true
    appDataActionDispatcher.setDesignMode(true);

    // Fetch data model
    appDataActionDispatcher.fetchDataModel(
      `${window.location.origin}/designer/${appId}/Model/GetJson`,
    );
    // Fetch form layout
    formDesignerActionDispatchers.fetchFormLayout(
      `${window.location.origin}/designer/${appId}/UIEditor/GetFormLayout`,
    );
    // Load text resources
    const languageCode = 'nb';
    const url = `${window.location.origin}/designer/${appId}/UIEditor/GetTextResources/${languageCode}`;
    dispatch(loadTextResources({ url }));

    // Fetch ServiceConfigurations
    manageServiceConfigurationActionDispatcher.fetchJsonFile(
      `${window.location.origin}/designer/${
        appId}/UIEditor/GetJsonFile?fileName=RuleConfiguration.json`,
    );
    // Fetch rule connections
    appDataActionDispatcher.fetchRuleModel(
      `${window.location.origin}/designer/${appId}/UIEditor/GetRuleHandler`,
    );
    // Fetch the CodeLists
    appDataActionDispatcher.fetchCodeLists(
      `${window.location.origin}/designer/${appId}/CodeList/CodeLists`,
    );
    // Fetch thirdParty Components
    ThirdPartyComponentsActionDispatcher.fetchThirdPartyComponents(
      `${window.location.origin}/designer/${appId}/UIEditor/GetThirdPartyComponents`,
    );
    // Fetch language
    appDataActionDispatcher.fetchLanguage(
      `${window.location.origin}/designerapi/Language/GetLanguageAsJSON`, 'nb',
    );
    // Fetch widget settings
    dispatch(fetchWidgetSettings());
    // Fetch witgets
    dispatch(fetchWidgets());
  };

  const shouldRefetchFiles = (event: any) => {
    if (event.data === postMessages.refetchFiles) {
      fetchFiles();
    }
  };

  React.useEffect(() => {
    window.addEventListener('message', shouldRefetchFiles);
    fetchFiles();
    return () => { window.removeEventListener('message', shouldRefetchFiles); };
  }, []);

  const renderFormDesigner = (): JSX.Element => {
    return <FormDesigner />;
  };

  return (
    <div>
      <ErrorMessageComponent />
      <Route
        exact={true}
        path='/ui-editor'
        render={renderFormDesigner}
      />
    </div>
  );
}

export default hot(module)(App);
