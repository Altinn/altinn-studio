import React from 'react';
import { Provider } from 'react-redux';
import './App.css';
import { SchemaEditor } from './components/SchemaEditor';

import { store } from './store';
import type { IJsonSchema, ILanguage } from './types';

export interface ISchemaEditorProps extends React.PropsWithChildren<any> {
  language: ILanguage;
  loading?: boolean;
  name?: string;
  onSaveSchema: (payload: any) => void;
  schema: IJsonSchema;
  LandingPagePanel: JSX.Element;
}

export function SchemaEditorApp({ children, ...other }: ISchemaEditorProps) {
  return (
    <Provider store={store}>
      <SchemaEditor Toolbar={children} {...other} />
    </Provider>
  );
}
