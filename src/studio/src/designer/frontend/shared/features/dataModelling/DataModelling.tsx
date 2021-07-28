import * as React from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { Button } from '@material-ui/core';
import { SchemaEditor, ISchemaEditorRef } from '@altinn/schema-editor/index';
import { ArchiveOutlined } from '@material-ui/icons';
import { getLanguageFromKey } from '../../utils/language';
import { deleteDataModel, fetchDataModel, createNewDataModel, saveDataModel } from './sagas';
import { Create, Delete, SchemaSelect } from './components';
import createDataModelMetadataOptions from './functions/createDataModelMetadataOptions';
import { sharedUrls } from '../../utils/urlHelper';
import findPreferredMetadataOption from './functions/findPreferredMetadataOption';
import schemaPathIsSame from './functions/schemaPathIsSame';
import { AltinnSpinner } from '../../components';
import shouldSelectPreferredOption from './functions/shouldSelectPreferredOption';
import { IMetadataOption } from './functions/types';

interface IDataModellingContainerProps extends React.PropsWithChildren<any> {
  language: any;
  preferredOptionLabel?: { label: string, clear: () => void };
}

function DataModelling(props: IDataModellingContainerProps): JSX.Element {
  const { language } = props;
  const dispatch = useDispatch();
  const jsonSchema = useSelector((state: any) => state.dataModelling.schema);
  const metadataOptions = useSelector(createDataModelMetadataOptions, shallowEqual);
  const [selectedOption, setSelectedOption] = React.useState(null);
  const [lastFetchedOption, setLastFetchedOption] = React.useState(null);
  const dataModellingRef = React.useRef<ISchemaEditorRef>(null);

  const onSchemaSelected = React.useCallback((option: IMetadataOption) => {
    if (props.preferredOptionLabel) {
      props.preferredOptionLabel.clear();
    }
    setSelectedOption(option);
  }, [props.preferredOptionLabel]);

  const selectPreferredOption = React.useCallback(() => {
    const option = findPreferredMetadataOption(metadataOptions, props.preferredOptionLabel?.label);
    if (option && !schemaPathIsSame(selectedOption, option)) {
      onSchemaSelected(option);
    }
  }, [metadataOptions, props.preferredOptionLabel?.label, selectedOption, onSchemaSelected]);

  React.useEffect(() => {
    if (!schemaPathIsSame(lastFetchedOption, selectedOption)) {
      dispatch(fetchDataModel({ metadata: selectedOption }));
      setLastFetchedOption(selectedOption);
    }
  }, [selectedOption, lastFetchedOption, dispatch]);

  React.useEffect(() => { // selects an option that exists in the dataModels-metadata
    if (!shouldSelectPreferredOption(metadataOptions, selectedOption, setSelectedOption)) {
      return;
    }
    selectPreferredOption();
  }, [metadataOptions, selectedOption, props.preferredOptionLabel, selectPreferredOption]);

  const onSaveSchema = (schema: any) => {
    const $id = sharedUrls().getDataModellingUrl(
      selectedOption?.value?.repositoryRelativeUrl || `/App/models/${selectedOption.label}.schema.json`,
    );
    dispatch(saveDataModel({ schema: { ...schema, $id }, metadata: selectedOption }));
  };

  const onDeleteSchema = () => {
    dispatch(deleteDataModel({ metadata: selectedOption }));
    onSchemaSelected(null);
  };

  const createAction = (modelName: string) => {
    dispatch(createNewDataModel({ modelName }));
    setSelectedOption({ label: modelName });
  };

  const getModelNames = () => {
    return metadataOptions?.map(({ label }: { label: string }) => label.toLowerCase()) || [];
  };

  const onSaveButtonClicked = () => {
    dataModellingRef.current?.onClickSaveJsonSchema();
  };

  return (
    <SchemaEditor
      containerRef={dataModellingRef}
      language={language}
      schema={jsonSchema}
      onSaveSchema={onSaveSchema}
      name={selectedOption?.label}
      LoadingComponent={<AltinnSpinner spinnerText={getLanguageFromKey('general.loading', language)} />}
    >
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
        disabled={!selectedOption}
        startIcon={<ArchiveOutlined />}
      >{getLanguageFromKey('schema_editor.save_data_model', language)}
      </Button>
    </SchemaEditor>
  );
}
export default DataModelling;
DataModelling.defaultProps = {
  preferredOptionLabel: undefined,
};
