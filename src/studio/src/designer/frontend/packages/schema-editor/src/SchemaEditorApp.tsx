import * as React from 'react';
import { Provider } from 'react-redux';
import './App.css';
import SchemaEditor, { IEditorRef as ISchemaEditorRef } from './components/Editor';
import { store } from './store';
import { ILanguage, ISchema } from './types';

export { ISchemaEditorRef };
export interface IAppProps extends React.PropsWithChildren<any> {
  schema: ISchema;
  language: ILanguage;
  name?: string;
  onSaveSchema: (payload: any) => void;
  containerRef?: React.RefObject<ISchemaEditorRef>;
  LoadingComponent?: JSX.Element;
}

function SchemaEditorApp(props: IAppProps) {
  return (
    <Provider store={store}>
      <SchemaEditor
        Toolbar={props.children}
        LoadingIndicator={props.LoadingComponent || <div>Loading...</div>}
        ref={props.containerRef}
        schema={props.schema}
        language={props.language}
        onSaveSchema={props.onSaveSchema}
        name={props.name}
      />
    </Provider>
  );
}

export default SchemaEditorApp;
