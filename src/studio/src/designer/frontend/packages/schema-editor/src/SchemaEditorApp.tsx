import * as React from 'react';
import { Provider } from 'react-redux';
import './App.css';
// eslint-disable-next-line import/no-named-as-default
import SchemaEditor, { ISchemaEditor } from './components/schemaEditor';
import { store } from './store';
import { ILanguage, ISchema } from './types';

export interface IAppProps {
  schema: ISchema;
  language: ILanguage;
  name?: string;
  onSaveSchema: (payload: any) => void;
  editorRef?: React.RefObject<ISchemaEditor>;
}

function SchemaEditorApp(props: IAppProps) {
  return (
    <div id='schema-editor-container'>
      <Provider store={store}>
        <SchemaEditor
          ref={props.editorRef}
          schema={props.schema}
          language={props.language}
          onSaveSchema={props.onSaveSchema}
          name={props.name}
        />
      </Provider>
    </div>
  );
}

export default SchemaEditorApp;
