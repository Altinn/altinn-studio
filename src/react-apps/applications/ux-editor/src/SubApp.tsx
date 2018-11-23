import * as React from 'react';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { run } from './sagas';
import { store } from './store';
import './styles/index.css';

export default class SubApp extends React.Component<any, any> {
  public store: any;

  constructor(props: any) {
    super(props);
    this.store = store;
    run();
  }

  public render() {
    return (
      <Provider store={store}>
      <HashRouter>
        <App />
      </HashRouter>
    </Provider>
    );
  }
}