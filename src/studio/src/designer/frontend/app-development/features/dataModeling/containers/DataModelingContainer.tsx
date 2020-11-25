import * as React from 'react';
// import { useSelector } from 'react-redux';
import SchemaEditorApp from '@altinn/schema-editor/SchemaEditorApp';
import DataModelingActions from '../dataModelingDispatcher';

const filePath = 'App/models/RA-0678_M';

// TODO: Find out why using this component breaks the build, and uncomment the relevant code.

function DataModelingContainer(): JSX.Element {
  // const jsonSchema = useSelector((state: IServiceDevelopmentState) => state.dataModeling.schema);

  React.useEffect(() => {
    DataModelingActions.setDataModelFilePath(filePath);
    DataModelingActions.fetchDataModel();
  }, []);

  const onSaveSchema = (schema: any) => {
    DataModelingActions.saveDataModel(schema);
  };

  return (
    <SchemaEditorApp
      schema={{
        properties: {},
      }}
      onSaveSchema={onSaveSchema}
      rootItemId='#/'
    />
  );
}

export default DataModelingContainer;
