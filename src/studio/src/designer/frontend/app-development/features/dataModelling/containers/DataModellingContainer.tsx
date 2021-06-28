import * as React from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import SchemaEditorApp from '@altinn/schema-editor/SchemaEditorApp';
import { createStyles, Grid, makeStyles } from '@material-ui/core';
import { IRouteProps } from 'config/routes';
import { IApplicationMetadataState } from 'sharedResources/applicationMetadata/applicationMetadataSlice';
import { IDatamodelsMetadataState } from 'sharedResources/datamodelsMetadata/datamodelsMetadataSlice';
import { deleteDataModel, fetchDataModel, createNewDataModel, saveDataModel } from '../sagas';
import { Create, Delete, SchemaSelect } from '../components';

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

interface IDataModellingContainerProps extends IRouteProps { }

export default function DataModellingContainer(props: IDataModellingContainerProps): JSX.Element {
  const { repoType } = props;
  const classes = useStyles();
  const dispatch = useDispatch();
  const jsonSchema = useSelector((state: IServiceDevelopmentState) => state.dataModelling.schema);

  const datamodelsMetadata = useSelector(
    repoType === 'datamodels'
      ? getDatamodelsSchemaNames
      : getApplicationSchemaNames,
    shallowEqual,
  );
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
  const getDataModelNames = () => {
    return datamodelsMetadata.map(({ label }: { label: string }) => label.toLowerCase()) || [];
  };
  const createAction = (modelName: string) => {
    dispatch(createNewDataModel({
      modelName,
      onNewNameCreated: (label: string) => {
        setSelectedModelMetadata({ label });
      },
    }));
  };

  return (
    <div className={classes.root}>
      <Grid container>
        <Create
          language={props.language}
          buttonClass={classes.button}
          dataModelNames={getDataModelNames()}
          createAction={createAction}
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
          language={props.language}
        />
      </Grid>
      {jsonSchema && selectedModelMetadata?.label &&
        <SchemaEditorApp
          language={props.language}
          schema={jsonSchema}
          onSaveSchema={onSaveSchema}
          rootItemId={`#/definitions/${selectedModelMetadata.label}`}
        />}
    </div>
  );
}

const getApplicationSchemaNames = (state: any) => {
  return (
    (state.repoMetadataState as IApplicationMetadataState)
      .applicationMetadata?.dataTypes?.filter((d: any) => d.appLogic)
      .map((d: any) => ({ value: d, label: d.id })) ?? []
  );
};

const getDatamodelsSchemaNames = (state: any) => {
  const metaDataState = (state.repoMetadataState as IDatamodelsMetadataState);
  return metaDataState.datamodelsMetadata?.length
    ? metaDataState.datamodelsMetadata.map((d: { fileName: string }) => {
      const id = d.fileName.split('.')[0];
      return {
        value: {
          ...d,
          id,
        },
        label: id,
      };
    }) : [];
};
