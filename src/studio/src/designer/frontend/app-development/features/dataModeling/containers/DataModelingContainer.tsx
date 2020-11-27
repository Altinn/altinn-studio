import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SchemaEditorApp from '@altinn/schema-editor/SchemaEditorApp';
import { fetchDataModel, saveDataModel, setDataModelFilePath } from '../dataModelingSlice';

// const filePath = 'App/models/RA-0678_M';
export interface IDataModelingContainer {
  filePath: string;
}

function DataModelingContainer({ filePath }: IDataModelingContainer): JSX.Element {
  const dispatch = useDispatch();
  const jsonSchema = useSelector((state: IServiceDevelopmentState) => state.dataModeling.schema);

  React.useEffect(() => {
    dispatch(setDataModelFilePath({ filePath }));
    dispatch(fetchDataModel({}));
  }, [dispatch]);

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
