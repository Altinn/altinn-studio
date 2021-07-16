import * as React from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { Button, createStyles, Grid, makeStyles } from '@material-ui/core';
import { ISchemaEditor } from '@altinn/schema-editor/components/schemaEditor';
import { ArchiveOutlined } from '@material-ui/icons';
import { getLanguageFromKey } from '../../utils/language';
import { deleteDataModel, fetchDataModel, createNewDataModel, saveDataModel } from './sagas';
import { Create, Delete, SchemaSelect } from './components';
import createDataModelMetadataOptions from './functions/createDataModelMetadataOptions';
import { sharedUrls } from '../../utils/urlHelper';

const useStyles = makeStyles(
  createStyles({
    root: {
      marginLeft: 80,
    },
    schema: {
      marginTop: 4,
    },
    button: {
      margin: 4,
    },
    toolbar: {
      background: '#fff',
      padding: 8,
      boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
      '& button': {
        background: '#fff',
      },
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
  const schemaEditorRef = React.useRef<ISchemaEditor>(null);

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
    const $id = sharedUrls().dataModelsApi + (selectedModelMetadata?.value?.repositoryRelativeUrl || `/App/models/${selectedModelMetadata.label}.schema.json`);
    dispatch(saveDataModel({ schema: { ...schema, $id }, metadata: selectedModelMetadata }));
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

  const onSaveButtonClicked = () => {
    schemaEditorRef.current?.onClickSaveJsonSchema();
  };

  return (
    <div className={classes.root}>
      <Grid container className={classes.toolbar}>
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
        <Button
          onClick={onSaveButtonClicked}
          type='button'
          variant='contained'
          startIcon={<ArchiveOutlined />}
          className={classes.button}
        >{getLanguageFromKey('schema_editor.save_data_model', language)}
        </Button>
      </Grid>
      {jsonSchema && selectedModelMetadata?.label &&
        <SchemaEditor
          editorRef={schemaEditorRef}
          language={language}
          schema={jsonSchema}
          onSaveSchema={onSaveSchema}
          name={selectedModelMetadata.label}
        />}
    </div>
  );
}
export default DataModelling;
