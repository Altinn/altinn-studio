import * as React from 'react';
import SchemaEditor from '@altinn/schema-editor/SchemaEditorApp';
import { IRouteProps } from 'config/routes';
import { DataModelling } from 'app-shared/features';

interface IDataModellingContainerProps extends IRouteProps {
  language: any;
}

export default function DataModellingContainer(props: IDataModellingContainerProps): JSX.Element {
  return (
    // Importing the ShcemaEditor inside the app-development project so the alias in webpack works.
    <DataModelling language={props.language} SchemaEditor={SchemaEditor} />
  );
}
