import * as React from 'react';
import { Provider } from 'react-redux';
import './App.css';
import SchemaEditor from './components/schemaEditor';
import { store } from './redux/store';

export interface IAppProps {
  saveUrl: string;
}

function App(props: IAppProps) {
  return (
    <Provider store={store}>
      <SchemaEditor saveUrl={props?.saveUrl} />
    </Provider>
  );
}

export default App;
