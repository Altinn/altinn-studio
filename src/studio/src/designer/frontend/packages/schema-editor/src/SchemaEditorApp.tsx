import * as React from 'react';
import { Provider } from 'react-redux';
import './App.css';
import SchemaEditor from './components/schemaEditor';
import { store } from './store';

export interface IAppProps {
  schema: any;
  rootItemId?: string;
  onSaveSchema: (payload: any) => void;
}

function SchemaEditorApp(props: IAppProps) {
  return (
    <Provider store={store}>
      <SchemaEditor schema={props.schema} onSaveSchema={props.onSaveSchema} rootItemId={props.rootItemId}/>
    </Provider>
  );
}

export default SchemaEditorApp;
