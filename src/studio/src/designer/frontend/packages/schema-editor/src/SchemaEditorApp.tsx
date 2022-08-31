import React from 'react';
import { Provider } from 'react-redux';
import './App.css';
import { SchemaEditor } from './components/SchemaEditor';

import { store } from './store';
import type { ILanguage, ISchema } from './types';

export interface ISchemaEditorProps extends React.PropsWithChildren<any> {
  language: ILanguage;
  loading?: boolean;
  name?: string;
  onSaveSchema: (payload: any) => void;
  schema: ISchema;
}

export function SchemaEditorApp(props: ISchemaEditorProps) {
  return (
    <Provider store={store}>
      <SchemaEditor
        Toolbar={props.children}
        language={props.language}
        loading={props.loading}
        name={props.name}
        onSaveSchema={props.onSaveSchema}
        schema={props.schema}
      />
    </Provider>
  );
}
