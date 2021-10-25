import * as React from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { SchemaEditor } from '@altinn/schema-editor/index';
import { ILanguage } from '@altinn/schema-editor/types';
import { getLanguageFromKey } from '../../utils/language';
import { deleteDataModel, fetchDataModel, createDataModel, saveDataModel } from './sagas';
import { Create, Delete, SchemaSelect, XSDUpload } from './components';
import createDataModelMetadataOptions from './functions/createDataModelMetadataOptions';
import findPreferredMetadataOption from './functions/findPreferredMetadataOption';
import schemaPathIsSame from './functions/schemaPathIsSame';
import { AltinnSpinner } from '../../components';
import { DataModelsMetadataActions, LoadingState } from './sagas/metadata';
import { IMetadataOption } from './functions/types';

interface IDataModellingContainerProps extends React.PropsWithChildren<any> {
  language: ILanguage;
  org: string;
  repo: string;
  createPathOption?: boolean;
}

type shouldSelectFirstEntryProps = {
  metadataOptions?: IMetadataOption[];
  selectedOption?: any;
  metadataLoadingState: LoadingState;
};

export const shouldSelectFirstEntry = ({
  metadataOptions,
  selectedOption,
  metadataLoadingState,
}: shouldSelectFirstEntryProps) => {
  return (
    metadataOptions?.length > 0 && selectedOption === undefined && metadataLoadingState === LoadingState.ModelsLoaded
  );
};

function DataModelling({ language, org, repo, createPathOption }: IDataModellingContainerProps): JSX.Element {
  const dispatch = useDispatch();
  const jsonSchema = useSelector((state: any) => state.dataModelling.schema);
  const metadataOptions = useSelector(createDataModelMetadataOptions, shallowEqual);
  const metadataLoadingState = useSelector((state: any) => state.dataModelsMetadataState.loadState);
  const [selectedOption, setSelectedOption] = React.useState(undefined);

  const uploadedOrCreatedFileName = React.useRef(null);
  const prevFetchedOption = React.useRef(null);

  const modelNames = metadataOptions?.map(({ label }: { label: string }) => label.toLowerCase()) || [];

  React.useEffect(() => {
    if (metadataLoadingState === LoadingState.LoadingModels) {
      setSelectedOption(undefined);
    } else if (shouldSelectFirstEntry({ metadataOptions, selectedOption, metadataLoadingState })) {
      setSelectedOption(metadataOptions[0]);
    } else {
      const option = findPreferredMetadataOption(metadataOptions, uploadedOrCreatedFileName.current);
      if (option) {
        setSelectedOption(option);
        uploadedOrCreatedFileName.current = null;
      }
    }
  }, [metadataOptions, selectedOption, metadataLoadingState]);

  React.useEffect(() => {
    if (!schemaPathIsSame(prevFetchedOption?.current, selectedOption)) {
      dispatch(fetchDataModel({ metadata: selectedOption }));
      prevFetchedOption.current = selectedOption;
    }
  }, [selectedOption, dispatch]);

  const handleSaveSchema = (schema: any) => {
    dispatch(saveDataModel({ schema, metadata: selectedOption }));
  };

  const handleDeleteSchema = () => {
    dispatch(deleteDataModel({ metadata: selectedOption }));
  };

  const handleCreateSchema = (model: { name: string; relativeDirectory?: string }) => {
    dispatch(createDataModel(model));
    uploadedOrCreatedFileName.current = model.name;
  };

  const handleXSDUploaded = (filename: string) => {
    const lowerCaseFileName = filename.toLowerCase();
    const filenameWithoutXsd = lowerCaseFileName.split('.xsd')[0];
    const schemaName = filename.substr(0, filenameWithoutXsd.length);

    uploadedOrCreatedFileName.current = schemaName;
    dispatch(DataModelsMetadataActions.getDataModelsMetadata());
  };

  return (
    <SchemaEditor
      language={language}
      schema={jsonSchema}
      onSaveSchema={handleSaveSchema}
      name={selectedOption?.label}
      LoadingComponent={<AltinnSpinner spinnerText={getLanguageFromKey('general.loading', language)} />}
    >
      <XSDUpload language={language} onXSDUploaded={handleXSDUploaded} org={org} repo={repo} />

      <Create
        language={language}
        createAction={handleCreateSchema}
        dataModelNames={modelNames}
        createPathOption={createPathOption}
      />
      <SchemaSelect selectedOption={selectedOption} onChange={setSelectedOption} options={metadataOptions} />
      <Delete
        schemaName={selectedOption?.value && selectedOption?.label}
        deleteAction={handleDeleteSchema}
        language={language}
      />
    </SchemaEditor>
  );
}
export default DataModelling;

DataModelling.defaultProps = {
  createPathOption: false,
};
