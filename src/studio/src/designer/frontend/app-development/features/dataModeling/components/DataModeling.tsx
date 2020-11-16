import * as React from 'react';
// import { useSelector } from 'react-redux';
// import { SchemaEditorApp } from '@altinn/schema-editor';
// import DataModelingActions from '../dataModelingDispatcher';
// import { getDataModelUrl, saveDataModelUrl } from '../../../utils/urlHelper';

// const filePath = 'App/models/RA-0678_M';

// TODO: Find out why using this component breaks the build, and uncomment the relevant code.

function DataModelingContainer(): JSX.Element {
  // const jsonSchema = useSelector((state: IServiceDevelopmentState) => state.dataModeling.schema);
  // React.useEffect(() => {
  //   DataModelingActions.fetchDataModel(getDataModelUrl(filePath));
  // }, []);

  // const onSaveSchema = (schema: any) => {
  //   const url = saveDataModelUrl(filePath);
  //   DataModelingActions.saveDataModel(url, schema);
  // };

  return (
    // <SchemaEditorApp
    //   schema={jsonSchema}
    //   onSaveSchema={onSaveSchema}
    //   rootItemId='#/properties/melding'
    // />
    <h4>Data modelling</h4>
  );
}

export default DataModelingContainer;
