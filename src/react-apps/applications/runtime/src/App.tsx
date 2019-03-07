import * as React from 'react';
import { Route } from 'react-router';
import appDataActionDispatcher from './actions/appDataActions/appDataActionDispatcher';
import formFillerActionDispatchers from './actions/formFillerActions/formFillerActionDispatcher';
import manageServiceConfigurationActionDispatcher from './actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';
import WorkflowActionDispatcher from './actions/workflowActions/worflowActionDispatcher';
import { ErrorMessageComponent } from './components/message/ErrorMessageComponent';
import { FormFiller } from './containers/FormFiller';

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
    if (event.data === 'NEWDATA') {
      this.fetchFiles();
    }
  }

  public fetchFiles() {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service, instanceId, reportee } = altinnWindow;
    const servicePath = `${org}/${service}`;

    // No need to check, since this will allways be in runtime mode
    appDataActionDispatcher.setDesignMode(false);

    // Fetch data model
    appDataActionDispatcher.fetchDataModel(
      `${altinnWindow.location.origin}/runtime/api/metadata/${servicePath}/ServiceMetaData`);

    // Fetch form layout
    formFillerActionDispatchers.fetchFormLayout(
      `${altinnWindow.location.origin}/runtime/api/resource/${servicePath}/FormLayout.json`);

    // Load text resources
    appDataActionDispatcher.loadTextResources(
      `${altinnWindow.location.origin}/runtime/api/textresources/${servicePath}`);

    // Fetch rule model
    appDataActionDispatcher.fetchRuleModel(
      `${altinnWindow.location.origin}/runtime/api/resource/${servicePath}/RuleHandler.js`);

    // Fetch form data
    formFillerActionDispatchers.fetchFormData(
      `${altinnWindow.location.origin}/runtime/api/${reportee}/${servicePath}/Index/${instanceId}`);

    // Fetch service configuration
    manageServiceConfigurationActionDispatcher.fetchJsonFile(
      `${altinnWindow.location.origin}/runtime/api/resource/${servicePath}/ServiceConfigurations.json`);

    // Fetch current workflow state
    WorkflowActionDispatcher.getCurrentState(
      `${altinnWindow.location.origin}/runtime/${servicePath}/${instanceId}/GetCurrentState?reporteeId=${reportee}`);

    // Fetch language
    appDataActionDispatcher.fetchLanguage(
      `${altinnWindow.location.origin}/runtime/api/Language/GetLanguageAsJSON`, 'nb');

    // Fetch thirdParty Components
    appDataActionDispatcher.fetchThirdPartyComponents(
      `${altinnWindow.location.origin}/runtime/api/resource/${servicePath}/ThirdPartyComponents.json`);

  }

  public render() {
    return (
      <div>
        <ErrorMessageComponent />
        <Route
          exact={true}
          path='/preview'
          component={FormFiller}
        />
      </div>
    );
  }
}

export default App;
