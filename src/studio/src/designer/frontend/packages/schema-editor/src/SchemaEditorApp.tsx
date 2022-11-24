import type { PropsWithChildren } from 'react';
import React from 'react';
import { Provider } from 'react-redux';
import './App.css';
import type { IEditorProps } from './components/SchemaEditor';
import { SchemaEditor } from './components/SchemaEditor';

import { store } from './store';
import { run } from './sagas';

run();

export function SchemaEditorApp({ children, ...other }: PropsWithChildren<any> & IEditorProps) {
  return (
    <Provider store={store}>
      <SchemaEditor {...other} Toolbar={children} />
    </Provider>
  );
}
