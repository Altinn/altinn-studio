import * as React from 'react';
import { hot } from 'react-hot-loader';
import postMessages from '../../shared/src/utils/postMessages';
import appDataActionDispatcher from './actions/appDataActions/appDataActionDispatcher';
import formDesignerActionDispatchers from './actions/formDesignerActions/formDesignerActionDispatcher';
import formFillerActionDispatchers from './actions/formFillerActions/formFillerActionDispatcher';
import manageServiceConfigurationActionDispatcher from './actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';
import ThirdPartyComponentsActionDispatcher from './actions/thirdPartyComponentsActions/thirdPartyComponentsActionDispatcher';
import { ErrorMessageComponent } from './components/message/ErrorMessageComponent';
import FormDesigner from './containers/FormDesigner';
import { FormFiller } from './containers/FormFiller';

// tslint:disable-next-line:no-implicit-dependencies
import { Route } from 'react-router-dom';
export interface IAppComponentProps { }

export interface IAppCompoentState { }

/**
 * This is the main React component responsible for controlling
 * the mode of the application and loading initial data for the
 * application
 */
export class App extends React.Component<IAppComponentProps, IAppCompoentState>  {

  public componentDidMount() {
    window.addEventListener('message', this.shouldRefetchFiles);
    this.fetchFiles();
  }
  public componentWillUnmount() {
    window.removeEventListener('message', this.shouldRefetchFiles);
  }

  public shouldRefetchFiles = (event: any) => {
    if (event.data === postMessages.refetchFiles) {
      this.fetchFiles();
    }
  }

  public fetchFiles() {
    const { org, app } = window as IAltinnWindow;
    const appId = `${org}/${app}`;

    // ALTINN STUDIO
    // Editor
    // Set design mode to true
    appDataActionDispatcher.setDesignMode(true);

    // Fetch data model
    appDataActionDispatcher.fetchDataModel(
      `${window.location.origin}/designer/${appId}/Model/GetJson`);
    // Fetch form layout
    formDesignerActionDispatchers.fetchFormLayout(
      `${window.location.origin}/designer/${appId}/UIEditor/GetFormLayout`);
    // Load text resources
    const languageCode = 'nb';
    appDataActionDispatcher.loadTextResources(
      `${window.location.origin}/designer/${appId}/UIEditor/GetTextResources/${languageCode}`);
    // Fetch ServiceConfigurations
    manageServiceConfigurationActionDispatcher.fetchJsonFile(
      `${window.location.origin}/designer/${
        appId}/UIEditor/GetJsonFile?fileName=RuleConfiguration.json`);
    // Fetch rule connections
    appDataActionDispatcher.fetchRuleModel(
      `${window.location.origin}/designer/${appId}/UIEditor/GetRuleHandler`);
    // Fetch the CodeLists
    appDataActionDispatcher.fetchCodeLists(
      `${window.location.origin}/designer/${appId}/CodeList/CodeLists`);
    // Fetch thirdParty Components
    ThirdPartyComponentsActionDispatcher.fetchThirdPartyComponents(
      `${window.location.origin}/designer/${appId}/UIEditor/GetThirdPartyComponents`);
    // Fetch language
    appDataActionDispatcher.fetchLanguage(
      `${window.location.origin}/designerapi/Language/GetLanguageAsJSON`, 'nb');

  }

  public resetFormData = (): JSX.Element => {
    const { org, app } = window as IAltinnWindow;
    const appId = `${org}/${app}`;
    formFillerActionDispatchers.resetFormData(
      `${window.location.origin}/designer/${appId}/UIEditor/GetFormLayout`);
    return <FormDesigner />;
  }

  public renderFormFiller = (): JSX.Element => {
    return <FormFiller />;
  }

  public render() {
    return (
      <div>
        <ErrorMessageComponent />
        <Route
          exact={true}
          path='/ui-editor'
          render={this.resetFormData}
        />
      </div>
    );
  }
}

export default hot(module)(App);
