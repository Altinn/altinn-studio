import * as React from 'react';
import SchemaEditor from '@altinn/schema-editor/SchemaEditorApp';
import { IRouteProps } from 'config/routes';
// import { IApplicationMetadataState } from 'sharedResources/applicationMetadata/applicationMetadataSlice';
import { DataModelling } from 'app-shared/features';

interface IDataModellingContainerProps extends IRouteProps { }

export default function DataModellingContainer(props: IDataModellingContainerProps): JSX.Element {
  /*const getApplicationSchemaNames = (state: any) => {
    return (
      (state.applicationMetadataState as IApplicationMetadataState)
        .applicationMetadata?.dataTypes?.filter((d: any) => d.appLogic)
        .map((d: any) => ({ value: d, label: d.id })) ?? []
    );
  };*/
  return (
    <DataModelling language={props.language} SchemaEditor={SchemaEditor} />
  );
}
