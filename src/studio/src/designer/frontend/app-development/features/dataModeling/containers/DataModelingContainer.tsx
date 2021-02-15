import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SchemaEditorApp from '@altinn/schema-editor/SchemaEditorApp';
import { fetchDataModel, saveDataModel, setDataModelName } from '../dataModelingSlice';
import { SchemaSelect } from '../schemaSelect';
import { createStyles, makeStyles } from '@material-ui/core';

function getDataModelTypeName(applicationMetadata: any) {
  if (!applicationMetadata || !applicationMetadata.dataTypes) return undefined;
  const dataTypeWithLogic = applicationMetadata.dataTypes.find((dataType: any) => dataType.appLogic);
  return dataTypeWithLogic?.id ?? 'default';
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
  const selectedDataModelName = useSelector((state: IServiceDevelopmentState) => state.dataModeling.modelName);

  const fetchModel = (name: string) => {
    dispatch(setDataModelName({ modelName: name }));
    dispatch(fetchDataModel({}));
  }

  React.useEffect(() => {
    if (dataModelName) {
      fetchModel(dataModelName);
    }
  }, [dispatch, dataModelName]);

  const onSchemaSelected = (id: string, schema: any) => {
    fetchModel(schema.id);
  }
  const onSaveSchema = (schema: any) => {
    dispatch(saveDataModel({ schema }));
  };

  return (
    <div className={classes.root}>
      <SchemaSelect id="schema" value={selectedDataModelName} onChange={onSchemaSelected}/>
      <SchemaEditorApp
        schema={jsonSchema || {}}
        onSaveSchema={onSaveSchema}
        rootItemId={`#/definitions/${selectedDataModelName}`}
      />
    </div>
  );
}

export default DataModelingContainer;
