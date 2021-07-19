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
import findPreferedMetadataOption from './functions/findPreferedMetadataOption';
import schemaPathIsSame from './functions/schemaPathIsSame';
import { AltinnSpinner } from '../../components';
import shouldSelectPreferedOption from './functions/shouldSelectPreferedOption';

const useStyles = makeStyles(
  createStyles({
    root: {
      marginLeft: 80,
    },
    schema: {
      marginTop: 4,
    },
    toolbar: {
      background: '#fff',
      padding: 8,
      boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
      '& > button': {
        margin: 4,
        background: '#fff',
      },
    },
  }),
);

interface IDataModellingContainerProps extends React.PropsWithChildren<any> {
  language: any;
  SchemaEditor: (props: any) => JSX.Element;
  preferedOptionLabel?: { label: string, clear: () => void };
}

function DataModelling(props: IDataModellingContainerProps): JSX.Element {
  const clearPreferedOption = () => {
    if (props.preferedOptionLabel) {
      props.preferedOptionLabel.clear();
    }
  };

  const { SchemaEditor, language } = props;
  const dispatch = useDispatch();
  const classes = useStyles();
  const jsonSchema = useSelector((state: any) => state.dataModelling.schema);

  const metadataOptions = useSelector(createDataModelMetadataOptions, shallowEqual);

  const [selectedOption, setSelectedOption] = React.useState(null);
  const [lastFetchedOption, setLastFetchedOption] = React.useState(null);
  const schemaEditorRef = React.useRef<ISchemaEditor>(null);

  React.useEffect(() => {
    if (!schemaPathIsSame(lastFetchedOption, selectedOption)) {
      dispatch(fetchDataModel({ metadata: selectedOption }));
      setLastFetchedOption(selectedOption);
    }
  }, [selectedOption, lastFetchedOption, dispatch]);
  React.useEffect(() => { // selects an option that exists in the dataModels-metadata
    if (!shouldSelectPreferedOption(metadataOptions, selectedOption, setSelectedOption)) {
      return;
    }
    const option = findPreferedMetadataOption(metadataOptions, props.preferedOptionLabel?.label);
    if (option && !schemaPathIsSame(selectedOption, option)) {
      setSelectedOption(option);
      props.preferedOptionLabel.clear();
    }
  }, [metadataOptions, selectedOption, props.preferedOptionLabel]);

  const onSchemaSelected = (s: any) => {
    clearPreferedOption();
    setSelectedOption(s);
  };

  const onSaveSchema = (schema: any) => {
    const $id = sharedUrls().getDataModellingUrl(
      selectedOption?.value?.repositoryRelativeUrl || `/App/models/${selectedOption.label}.schema.json`,
    );
    dispatch(saveDataModel({ schema: { ...schema, $id }, metadata: selectedOption }));
  };

  const onDeleteSchema = () => {
    dispatch(deleteDataModel({ metadata: selectedOption }));
    setSelectedOption(null);
    clearPreferedOption();
  };

  const createAction = (modelName: string) => {
    dispatch(createNewDataModel({ modelName }));
    setSelectedOption({ label: modelName });
  };
  const getModelNames = () => {
    return metadataOptions?.map(({ label }: { label: string }) => label.toLowerCase()) || [];
  };

  const onSaveButtonClicked = () => {
    schemaEditorRef.current?.onClickSaveJsonSchema();
  };

  return (
    <div className={classes.root}>
      <Grid container className={classes.toolbar}>
        {props.children}
        <Create
          language={language}
          createAction={createAction}
          dataModelNames={getModelNames()}
        />
        <SchemaSelect
          selectedOption={selectedOption}
          onChange={onSchemaSelected}
          options={metadataOptions}
        />
        <Delete
          schemaName={selectedOption?.value && selectedOption?.label}
          deleteAction={onDeleteSchema}
          language={language}
        />
        <Button
          onClick={onSaveButtonClicked}
          type='button'
          variant='contained'
          startIcon={<ArchiveOutlined />}
        >{getLanguageFromKey('schema_editor.save_data_model', language)}
        </Button>
      </Grid>
      {selectedOption?.label && (
        jsonSchema ?
          <SchemaEditor
            editorRef={schemaEditorRef}
            language={language}
            schema={jsonSchema}
            onSaveSchema={onSaveSchema}
            name={selectedOption.label}
          />
          : <AltinnSpinner spinnerText={getLanguageFromKey('general.loading', language)} />
      )}
    </div>
  );
}
export default DataModelling;
DataModelling.defaultProps = {
  preferedOptionLabel: undefined,
};
