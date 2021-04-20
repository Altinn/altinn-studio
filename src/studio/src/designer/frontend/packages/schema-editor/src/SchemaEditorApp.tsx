import * as React from 'react';
import { Provider } from 'react-redux';
import './App.css';
import SchemaEditor from './components/schemaEditor';
import { store } from './store';
import { ISchema } from './types';

export interface IAppProps {
  schema: ISchema;
  rootItemId?: string;
  onSaveSchema: (payload: any) => void;
}

function SchemaEditorApp(props: IAppProps) {
  return (
    <div id='schema-editor-container'>
      <Provider store={store}>
        <SchemaEditor
          schema={props.schema}
          onSaveSchema={props.onSaveSchema}
          rootItemId={props.rootItemId}
        />
      </Provider>
    </div>
  );
}

export default SchemaEditorApp;
