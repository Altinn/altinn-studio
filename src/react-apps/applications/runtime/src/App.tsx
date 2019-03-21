import * as React from 'react';
import FormLayoutActions from './features/form/layout/actions';
import FormDataActions from './features/form/data/actions';

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
    FormLayoutActions.fetchFormLayout(
      `${window.location.origin}/runtime/api/resource/${org}/${service}/FormLayout.json`,
    );
    FormDataActions.fetchFormData(
      `${window.location.origin}/runtime/api/${reportee}/${org}/${service}/Index/${instanceId}`,
    );
  }

  public render(): JSX.Element {
    return (
      <div>
        Sup?
      </div>
    )
  }
}

export default App;