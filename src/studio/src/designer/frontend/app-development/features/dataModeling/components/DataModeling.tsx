import * as React from 'react';
import { SchemaEditorApp } from '@altinn/schema-editor';
import { useSelector } from 'react-redux';
import DataModelingActions from '../dataModelingDispatcher';
import { getDataModelUrl } from '../../../utils/urlHelper';

const filePath = 'App/models/RA-0678';

function DataModelingContainer(props: any) {
  const jsonSchema = useSelector((state: IServiceDevelopmentState) => state.dataModeling.schema);
  React.useEffect(() => {
    DataModelingActions.fetchDataModel(getDataModelUrl(filePath));
  }, []);

  const onSaveSchema = (schema: any) => {
    console.log('save schema: ', schema);
  };

  return (
    <SchemaEditorApp schema={jsonSchema} onSaveSchema={onSaveSchema} />
  );
}

export default DataModelingContainer;
