import * as React from 'react';
import { Provider } from 'react-redux';
import './App.css';
import SchemaEditor from './components/Editor';
import { store } from './store';
import { ILanguage, ISchema } from './types';
import { getTranslation } from './utils';

export interface IAppProps extends React.PropsWithChildren<any> {
  schema: ISchema;
  language: ILanguage;
  name?: string;
  onSaveSchema: (payload: any) => void;
  LoadingComponent?: JSX.Element;
}

function SchemaEditorApp(props: IAppProps) {
  return (
    <Provider store={store}>
      <SchemaEditor
        Toolbar={props.children}
        LoadingIndicator={props.LoadingComponent || <div>{getTranslation('loading', props.language)}</div>}
        schema={props.schema}
        language={props.language}
        onSaveSchema={props.onSaveSchema}
        name={props.name}
      />
    </Provider>
  );
}

export default SchemaEditorApp;
