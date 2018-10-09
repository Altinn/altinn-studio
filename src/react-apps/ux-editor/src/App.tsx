import * as React from 'react';
import { hot } from 'react-hot-loader';
import appDataActionDispatcher from './actions/appDataActions/appDataActionDispatcher';
import formDesignerActionDispatchers from './actions/formDesignerActions/formDesignerActionDispatcher';
import formFillerActionDispatchers from './actions/formFillerActions/formFillerActionDispatcher';
import manageServiceConfigurationActionDispatcher from './actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';
import ThirdPartyComponentsActionDispatcher from './actions/thirdPartyComponentsActions/thirdPartyComponentsActionDispatcher';
import { ErrorMessageComponent } from './components/message/ErrorMessageComponent';
import FormDesigner from './containers/FormDesigner';
import { FormFiller } from './containers/FormFiller';

// tslint:disable-next-line:no-implicit-dependencies
import { Route } from 'react-router';
export interface IAppComponentProps { }

export interface IAppCompoentState { }

const RUNTIME = 'runtime';
const PREVIEW = 'preview';

/**
 * This is the main React component responsible for controlling
 * the mode of the application and loading initial data for the
 * application
 */
class App extends React.Component<IAppComponentProps, IAppCompoentState>  {

  public componentDidMount() {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service, edition, instanceId, reportee } = altinnWindow;
    const serviceEditionPath = `${org}/${service}/${edition}`;

    if (altinnWindow.location.pathname.split('/')[1].toLowerCase() === RUNTIME) {
      // RUNTIME
      // Set design mode to false
      appDataActionDispatcher.setDesignMode(false);

      // Fetch data model
      appDataActionDispatcher.fetchDataModel(
        `${altinnWindow.location.origin}/runtime/api/metadata/${serviceEditionPath}/ServiceMetaData`);

      // Fetch form layout
      formDesignerActionDispatchers.fetchFormLayout(
        `${altinnWindow.location.origin}/runtime/api/resource/${serviceEditionPath}/FormLayout.json`);

      // Load text resources
      appDataActionDispatcher.loadTextResources(
        `${altinnWindow.location.origin}/runtime/api/textresources/${serviceEditionPath}`);

      // Fetch rule model
      appDataActionDispatcher.fetchRuleModel(
        `${altinnWindow.location.origin}/runtime/api/resource/${serviceEditionPath}/RuleHandler.js`);

      // Fetch form data
      formFillerActionDispatchers.fetchFormData(
        `${altinnWindow.location.origin}/runtime/api/${reportee}/${serviceEditionPath}/Index/${instanceId}`);

      // Fetch service configuration
      manageServiceConfigurationActionDispatcher.fetchJsonFile(
        `${altinnWindow.location.origin}/runtime/api/resource/${serviceEditionPath}/ServiceConfigurations.json`);

    } else {
      // ALTINN STUDIO
      if (window.location.hash.split('#/')[1] && window.location.hash.split('#/')[1].toLowerCase() === PREVIEW) {
        // Preview
        // Set design mode to false
        appDataActionDispatcher.setDesignMode(false);
      } else {
        // Editor
        // Set design mode to true
        appDataActionDispatcher.setDesignMode(true);
      }

      // Fetch data model
      appDataActionDispatcher.fetchDataModel(
        `${altinnWindow.location.origin}/designer/${serviceEditionPath}/Model/GetJson`);

      // Fetch form layout
      formDesignerActionDispatchers.fetchFormLayout(
        `${altinnWindow.location.origin}/designer/${serviceEditionPath}/React/GetFormLayout`);

      // Load text resources
      const languageCode = 'nb-NO';
      appDataActionDispatcher.loadTextResources(
        `${altinnWindow.location.origin}/designer/${serviceEditionPath}/React/GetTextResources/${languageCode}`);

      // Fetch ServiceConfigurations
      manageServiceConfigurationActionDispatcher.fetchJsonFile(
        `${altinnWindow.location.origin}/designer/${
        serviceEditionPath}/React/GetJsonFile?fileName=ServiceConfigurations.json`);

      // Fetch rule connections
      appDataActionDispatcher.fetchRuleModel(
        `${altinnWindow.location.origin}/designer/${serviceEditionPath}/React/GetRuleHandler`);

      // Fetch the CodeLists 
      appDataActionDispatcher.fetchCodeLists(
        `${altinnWindow.location.origin}/designer/${serviceEditionPath}/CodeList/CodeLists`);

      ThirdPartyComponentsActionDispatcher.fetchThirdPartyComponents(
        `${altinnWindow.location.origin}/designer/${serviceEditionPath}/React/GetThirdPartyComponents`);
    }
  }

  public render() {
    return (
      <div className='App flex-column d-flex media-body'>
        <ErrorMessageComponent />
        <Route exact={true} path='/' component={FormDesigner} />
        <Route exact={true} path='/Preview' component={FormFiller} />
      </div>
    );
  }
}

export default hot(module)(App);
