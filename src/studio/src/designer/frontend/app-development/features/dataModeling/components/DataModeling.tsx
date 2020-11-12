import * as React from 'react';
import { SchemaEditorApp } from '@altinn/schema-editor';
import { useSelector } from 'react-redux';
import DataModelingActions from '../dataModelingDispatcher';
import { getDataModelUrl, saveDataModelUrl } from '../../../utils/urlHelper';

const filePath = 'App/models/RA-0678_M';

function DataModelingContainer(props: any) {
  const jsonSchema = useSelector((state: IServiceDevelopmentState) => state.dataModeling.schema);
  React.useEffect(() => {
    DataModelingActions.fetchDataModel(getDataModelUrl(filePath));
  }, []);

  const onSaveSchema = (schema: any) => {
    const url = saveDataModelUrl(filePath);
    DataModelingActions.saveDataModel(url, schema);
  };

  return (
    <SchemaEditorApp
      schema={jsonSchema}
      onSaveSchema={onSaveSchema}
      rootItemId={'#/properties/melding'}
    />
  );
}

export default DataModelingContainer;
