import React from 'react';
import { Provider } from 'react-redux';
import './App.css';
import SchemaEditor from './components/Editor';
import { store } from './store';
import type { ILanguage, ISchema } from './types';

export interface IAppProps extends React.PropsWithChildren<any> {
  language: ILanguage;
  loading?: boolean;
  name?: string;
  onSaveSchema: (payload: any) => void;
  schema: ISchema;
}

function SchemaEditorApp(props: IAppProps) {
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

export default SchemaEditorApp;
