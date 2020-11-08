import * as React from 'react';
import { Provider } from 'react-redux';
import './App.css';
import SchemaEditor from './schemaEditor';
import { store } from './redux/store';

export function App() {
  return (
    <Provider store={store}>
      <SchemaEditor />
    </Provider>
  );
}
