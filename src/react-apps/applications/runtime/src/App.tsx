import * as React from 'react';
import FormDataActions from './features/form/data/actions';
import FormDataModelActions from './features/form/datamodell/actions';
import FormLayoutActions from './features/form/layout/actions';
import FormWorkflowActions from './features/form/workflow/actions';
import FormDynamicActions from './features/form/dynamics/actions';
import LanguageActions from './features/languages/actions';

import './app.css';

export interface IAppProps { }
export interface IAppState { }

interface IAltinnWindow extends Window {
  org: string;
  service: string;
  instanceId: string;
  reportee: string;
}

class App extends React.Component<IAppProps, IAppState> {
  public componentDidMount() {
    const { org, service, instanceId, reportee } = window as IAltinnWindow;
    FormDataModelActions.fetchDataModel(
      `${window.location.origin}/runtime/api/metadata/${org}/${service}/ServiceMetaData`
    );
    FormLayoutActions.fetchFormLayout(
      `${window.location.origin}/runtime/api/resource/${org}/${service}/FormLayout.json`,
    );
    FormDataActions.fetchFormData(
      `${window.location.origin}/runtime/api/${reportee}/${org}/${service}/Index/${instanceId}`,
    );
    FormWorkflowActions.getCurrentState(
      `${window.location.origin}/runtime/${org}/${service}/${instanceId}/GetCurrentState?reporteeId=${reportee}`,
    );
    FormDynamicActions.fetchFormDynamics(
      `${window.location.origin}/runtime/api/resource/${org}/${service}/ServiceConfigurations.json`
    )
    LanguageActions.fetchLanguage(
      `${window.location.origin}/runtime/api/Language/GetLanguageAsJSON`, 'nb');
  }

  public render(): JSX.Element {
    return (
      <div>
        <h1> Hello </h1>
      </div>
    )
  }
}

export default App;
