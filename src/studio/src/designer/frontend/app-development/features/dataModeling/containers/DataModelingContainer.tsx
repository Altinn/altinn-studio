import * as React from 'react';
import { useSelector } from 'react-redux';
import SchemaEditorApp from '@altinn/schema-editor/SchemaEditorApp';
import { getSaveDataModelUrl } from '../../../utils/urlHelper';
import DataModelingActions from '../dataModelingDispatcher';

const filePath = 'App/models/RA-0678_M';

// TODO: Find out why using this component breaks the build, and uncomment the relevant code.

function DataModelingContainer(): JSX.Element {
  const jsonSchema = useSelector((state: IServiceDevelopmentState) => state.dataModeling.schema);
  const url = getSaveDataModelUrl(filePath);

  React.useEffect(() => {
    DataModelingActions.fetchDataModel();
  }, []);

  const onSaveSchema = (schema: any) => {
    DataModelingActions.saveDataModel(url, schema);
  };

  return (
    <SchemaEditorApp
      schema={jsonSchema}
      onSaveSchema={onSaveSchema}
      rootItemId='#/properties/melding'
    />
  );
}

export default DataModelingContainer;
