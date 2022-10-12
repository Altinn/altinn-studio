import React, { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import './App.css';
import { IEditorProps, SchemaEditor } from './components/SchemaEditor';

import { store } from './store';

export function SchemaEditorApp({ children, ...other }: PropsWithChildren<any> & IEditorProps) {
  return (
    <Provider store={store}>
      <SchemaEditor {...other} Toolbar={children} />
    </Provider>
  );
}
