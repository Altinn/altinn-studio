import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SchemaEditorApp from '@altinn/schema-editor/SchemaEditorApp';
import { fetchDataModel, saveDataModel, setDataModelName } from '../dataModelingSlice';

function getDataModelTypeName(applicationMetadata: any) {
  if (!applicationMetadata || !applicationMetadata.dataTypes) return undefined;
  const dataTypeWithLogic = applicationMetadata.dataTypes.find((dataType: any) => dataType.appLogic);
  return dataTypeWithLogic.id;
}

function DataModelingContainer(): JSX.Element {
  const dispatch = useDispatch();
  const jsonSchema = useSelector((state: IServiceDevelopmentState) => state.dataModeling.schema);
  const dataModelName = useSelector(
    (state: IServiceDevelopmentState) => getDataModelTypeName(state.applicationMetadataState.applicationMetadata),
  );

  React.useEffect(() => {
    if (dataModelName) {
      dispatch(setDataModelName({ modelName: dataModelName }));
      dispatch(fetchDataModel({}));
    }
  }, [dispatch, dataModelName]);

  const onSaveSchema = (schema: any) => {
    dispatch(saveDataModel({ schema }));
  };

  return (
    <SchemaEditorApp
      schema={jsonSchema || {}}
      onSaveSchema={onSaveSchema}
      rootItemId={`#/definitions/${dataModelName}`}
    />
  );
}

export default DataModelingContainer;
