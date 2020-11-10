import * as React from 'react';
import { Provider } from 'react-redux';
import './App.css';
import SchemaEditor from './components/schemaEditor';
import { store } from './redux/store';

export interface IAppProps {
  schema: any;
  onSaveSchema: (payload: any) => void;
}

function SchemaEditorApp(props: IAppProps) {
  return (
    <Provider store={store}>
      <SchemaEditor schema={props.schema} onSaveSchema={props.onSaveSchema} />
    </Provider>
  );
}

export default SchemaEditorApp;
