import * as React from 'react';
import { Provider } from 'react-redux';
import './App.css';
// eslint-disable-next-line import/no-named-as-default
import SchemaEditor from './components/schemaEditor';
import { store } from './store';
import { ILanguage, ISchema } from './types';

export interface IAppProps {
  schema: ISchema;
  language: ILanguage;
  rootItemId?: string;
  onSaveSchema: (payload: any) => void;
}

function SchemaEditorApp(props: IAppProps) {
  return (
    <div id='schema-editor-container'>
      <Provider store={store}>
        <SchemaEditor
          schema={props.schema}
          language={props.language}
          onSaveSchema={props.onSaveSchema}
          rootItemId={props.rootItemId}
        />
      </Provider>
    </div>
  );
}

export default SchemaEditorApp;
