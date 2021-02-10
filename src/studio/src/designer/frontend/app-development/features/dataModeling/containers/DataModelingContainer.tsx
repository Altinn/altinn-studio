import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SchemaEditorApp from '@altinn/schema-editor/SchemaEditorApp';
import { fetchDataModel, saveDataModel, setDataModelName } from '../dataModelingSlice';
import { SchemaSelect } from '../schemaSelect';
import { createStyles, makeStyles } from '@material-ui/core';

export interface IDataModelingContainer {
  filePath: string;
}

function getDataModelTypeName(applicationMetadata: any) {
  if (!applicationMetadata || !applicationMetadata.dataTypes) return undefined;
  const dataTypeWithLogic = applicationMetadata.dataTypes.find((dataType: any) => dataType.appLogic);
  return dataTypeWithLogic.id;
}

const useStyles = makeStyles(
  createStyles({
    root: {
      marginTop: 24,
      marginLeft: 80,
    },
  }),
);


function DataModelingContainer(): JSX.Element {
  const classes = useStyles();
  const dispatch = useDispatch();
  const jsonSchema = useSelector((state: IServiceDevelopmentState) => state.dataModeling.schema);
  const dataModelName = useSelector(
    (state: IServiceDevelopmentState) => getDataModelTypeName(state.applicationMetadataState.applicationMetadata),
  );
  const [selectedDataModel, setSelectedDataModel] = React.useState(dataModelName)
 
  React.useEffect(() => {
    if (dataModelName) {
      setSelectedDataModel(dataModelName);
      dispatch(setDataModelName({ modelName: dataModelName }));
      dispatch(fetchDataModel({}));
    }
  }, [dispatch, dataModelName]);

  const onSaveSchema = (schema: any) => {
    dispatch(saveDataModel({ schema }));
  };

  const onSchemaSelected = (id: string, schema: any) => {
    console.log(schema);
    setSelectedDataModel(schema.id);
    dispatch(setDataModelName({ modelName: schema.id }));
    dispatch(fetchDataModel({}));
  }

  return (
    <div className={classes.root}>
      <SchemaSelect id="schema" value={selectedDataModel} onChange={onSchemaSelected}/>
      <SchemaEditorApp
        schema={jsonSchema || {}}
        onSaveSchema={onSaveSchema}
        rootItemId={`#/definitions/${selectedDataModel}`}
      />
    </div>
  );
}

export default DataModelingContainer;
