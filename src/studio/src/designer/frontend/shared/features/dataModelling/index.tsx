import * as React from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { createStyles, Grid, makeStyles } from '@material-ui/core';
import { deleteDataModel, fetchDataModel, createNewDataModel, saveDataModel } from './sagas';
import { Create, Delete, SchemaSelect } from './components';
import getDatamodelsSchemaNames from './functions/getDataModelsSchemaNames';

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
  getMetadata?: (state: any) => { value: any, label: string }[];
}

export default function DataModellingContainer(props: IDataModellingContainerProps): JSX.Element {
  const { SchemaEditor, language, getMetadata } = props;
  const repoType = 'datamod';
  const classes = useStyles();
  const dispatch = useDispatch();
  const jsonSchema = useSelector((state: any) => state.dataModelling.schema);

  const datamodelsMetadata = useSelector(getMetadata || getDatamodelsSchemaNames, shallowEqual);
  const [selectedModelMetadata, setSelectedModelMetadata] = React.useState(null);

  const fetchModel = () => {
    dispatch(fetchDataModel({ repoType, metadata: selectedModelMetadata }));
  };

  React.useEffect(() => { // selects an option that exists in the datamodels-metadata
    if (!datamodelsMetadata?.length) { // no datamodels
      return;
    }
    if (!selectedModelMetadata?.label) { // automatically select if no label (on initial load)
      setSelectedModelMetadata(datamodelsMetadata[0]);
    }
    if (!selectedModelMetadata) {
      return;
    }
    const option = datamodelsMetadata.find(({ label }: { label: string }) => selectedModelMetadata.label === label);
    if (selectedModelMetadata.label && selectedModelMetadata.value && !option) { // if the datamodel has been deleted
      setSelectedModelMetadata(datamodelsMetadata[0]);
    }
    else if (!selectedModelMetadata.value && option) { // if the model was recently created and saved
      setSelectedModelMetadata(option);
    }
  }, [datamodelsMetadata]);

  React.useEffect(() => {
    if (selectedModelMetadata?.value) {
      fetchModel();
    }
  }, [selectedModelMetadata]);

  const onSchemaSelected = setSelectedModelMetadata;

  const onSaveSchema = (schema: any) => {
    dispatch(saveDataModel({ schema, repoType, metadata: selectedModelMetadata }));
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
    return datamodelsMetadata.map(({ label }: { label: string }) => label.toLowerCase()) || [];
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
          options={datamodelsMetadata}
        />
        <Delete
          schemaName={selectedModelMetadata?.value && selectedModelMetadata?.label}
          deleteAction={() => dispatch(deleteDataModel({ repoType, metadata: selectedModelMetadata }))}
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
