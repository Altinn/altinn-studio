import * as React from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { createStyles, Grid, makeStyles } from '@material-ui/core';
import { deleteDataModel, fetchDataModel, createNewDataModel, saveDataModel } from './sagas';
import { Create, Delete, SchemaSelect } from './components';
import createDataModelMetadataOptions from './functions/createDataModelMetadataOptions';

const useStyles = makeStyles(
  createStyles({
    root: {
      marginTop: 24,
      marginLeft: 80,
    },
    schema: {
      marginTop: 4,
    },
    button: {
      margin: 4,
    },
  }),
);

interface IDataModellingContainerProps {
  language: any;
  SchemaEditor: (props: any) => JSX.Element;
}

function DataModelling(props: IDataModellingContainerProps): JSX.Element {
  const { SchemaEditor, language } = props;
  const dispatch = useDispatch();
  const classes = useStyles();
  const jsonSchema = useSelector((state: any) => state.dataModelling.schema);

  const dataModelsMetadata = useSelector(createDataModelMetadataOptions, shallowEqual);

  const [selectedModelMetadata, setSelectedModelMetadata] = React.useState(null);

  React.useEffect(() => {
    if (selectedModelMetadata?.value) {
      const fetchModel = () => {
        dispatch(fetchDataModel({ metadata: selectedModelMetadata }));
      };
      fetchModel();
    }
  }, [selectedModelMetadata, dispatch]);

  React.useEffect(() => { // selects an option that exists in the dataModels-metadata
    if (!dataModelsMetadata?.length) { // no dataModels
      return;
    }
    if (!selectedModelMetadata?.label) { // automatically select if no label (on initial load)
      setSelectedModelMetadata(dataModelsMetadata[0]);
    }
    if (!selectedModelMetadata) {
      return;
    }
    const option = dataModelsMetadata.find(({ label }: { label: string }) => selectedModelMetadata.label === label);
    if (selectedModelMetadata.label && selectedModelMetadata.value && !option) { // if the dataModel has been deleted
      setSelectedModelMetadata(dataModelsMetadata[0]);
    } else if (!selectedModelMetadata.value && option) { // if the model was recently created and saved
      setSelectedModelMetadata(option);
    }
  }, [dataModelsMetadata, selectedModelMetadata]);

  const onSchemaSelected = setSelectedModelMetadata;

  const onSaveSchema = (schema: any) => {
    dispatch(saveDataModel({ schema, metadata: selectedModelMetadata }));
  };

  const createAction = (modelName: string) => {
    dispatch(createNewDataModel({
      modelName,
      onNewNameCreated: (label: string) => {
        setSelectedModelMetadata({ label });
      },
    }));
  };
  const getModelNames = () => {
    return dataModelsMetadata?.map(({ label }: { label: string }) => label.toLowerCase()) || [];
  };

  return (
    <div className={classes.root}>
      <Grid container>
        <Create
          language={language}
          buttonClass={classes.button}
          createAction={createAction}
          dataModelNames={getModelNames()}
        />
        <SchemaSelect
          selectedOption={selectedModelMetadata}
          onChange={onSchemaSelected}
          options={dataModelsMetadata || []}
        />
        <Delete
          schemaName={selectedModelMetadata?.value && selectedModelMetadata?.label}
          deleteAction={() => dispatch(deleteDataModel({ metadata: selectedModelMetadata }))}
          buttonClass={classes.button}
          language={language}
        />
      </Grid>
      {jsonSchema && selectedModelMetadata?.label &&
        <SchemaEditor
          language={language}
          schema={jsonSchema}
          onSaveSchema={onSaveSchema}
          rootItemId={`#/definitions/${selectedModelMetadata.label}`}
        />}
    </div>
  );
}
export default DataModelling;
