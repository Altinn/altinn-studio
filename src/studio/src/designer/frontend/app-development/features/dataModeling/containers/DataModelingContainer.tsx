import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SchemaEditorApp from '@altinn/schema-editor/SchemaEditorApp';
import { fetchDataModel, saveDataModel, setDataModelFilePath } from '../dataModelingSlice';

// const filePath = 'App/models/RA-0678_M';
export interface IDataModelingContainer {
  filePath: string;
}

function getDataModelFileType(applicationMetadata: any) {
  if (!applicationMetadata || !applicationMetadata.dataTypes) return undefined;
  const dataTypeWithLogic = applicationMetadata.dataTypes.find((dataType: any) => dataType.appLogic);
  if (dataTypeWithLogic) {
    return `App/models/${dataTypeWithLogic.id}`;
  }
  return undefined;
}

function DataModelingContainer(): JSX.Element {
  const dispatch = useDispatch();
  const jsonSchema = useSelector((state: IServiceDevelopmentState) => state.dataModeling.schema);
  const filePath = useSelector(
    (state: IServiceDevelopmentState) => getDataModelFileType(state.applicationMetadataState.applicationMetadata),
  );

  React.useEffect(() => {
    if (filePath) {
      dispatch(setDataModelFilePath({ filePath }));
      dispatch(fetchDataModel({}));
    }
  }, [dispatch, filePath]);

  const onSaveSchema = (schema: any) => {
    dispatch(saveDataModel({ schema }));
  };

  return (
    <SchemaEditorApp
      schema={jsonSchema || {}}
      onSaveSchema={onSaveSchema}
      rootItemId='#/definitions/RA-0678_M'
    />
  );
}

export default DataModelingContainer;
