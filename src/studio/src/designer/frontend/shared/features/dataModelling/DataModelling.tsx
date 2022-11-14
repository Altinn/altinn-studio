import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, ButtonColor, ButtonVariant, Panel } from '@altinn/altinn-design-system';
import { SchemaEditorApp } from '@altinn/schema-editor/index';
import type { ILanguage } from '@altinn/schema-editor/types';
import { deleteDataModel, fetchDataModel, saveDataModel } from './sagas';
import { findPreferredMetadataOption } from './functions/findPreferredMetadataOption';
import { schemaPathIsSame } from './functions/schemaPathIsSame';
import { DataModelsMetadataActions } from './sagas/metadata';
import type { IMetadataOption } from './functions/types';
import { LandingPagePanel } from './components/LandingPagePanel/LandingPagePanel';
import { Dialog } from '@mui/material';
import { createStyles, makeStyles } from '@mui/styles';
import { getLanguageFromKey } from '../../utils/language';
import {
  getLocalStorageItem,
  setLocalStorageItem,
} from './functions/localStorage';
import { CreateNewWrapper } from './components/CreateNewWrapper';
import { DeleteWrapper } from './components/DeleteWrapper';
import { SchemaSelect } from './components/SchemaSelect';
import { XSDUpload } from './components/XSDUpload';
import { sharedUrls } from '../../utils/urlHelper';
import {
  useCreateModelMutation,
  useGetMetadataQuery,
  useGetMetadataXsdQuery,
} from './services/datamodelsApi';

interface IDataModellingContainerProps extends React.PropsWithChildren<any> {
  language: ILanguage;
  org: string;
  repo: string;
  createPathOption?: boolean;
}

type shouldSelectFirstEntryProps = {
  metadataOptions?: IMetadataOption[];
  selectedOption?: any;
  metadataLoadingState: boolean;
};

enum LandingDialogState {
  DatamodelsNotLoaded = 'DATAMODELS_NOT_LOADED',
  DialogIsVisible = 'DIALOG_IS_VISIBLE',
  DialogShouldNotBeShown = 'DIALOG_SHOULD_NOT_BE_SHOWN',
}

export const shouldSelectFirstEntry = ({
  metadataOptions,
  selectedOption,
  metadataLoadingState,
}: shouldSelectFirstEntryProps) => {
  return (
    metadataOptions?.length > 0 &&
    selectedOption === undefined &&
    metadataLoadingState
  );
};

const useStyles = makeStyles(
  createStyles({
    button: {
      marginRight: 16,
    },
  }),
);

export function DataModelling({
  language,
  org,
  repo,
  createPathOption,
}: IDataModellingContainerProps): JSX.Element {
  const classes = useStyles();
  const dispatch = useDispatch();
  const jsonSchema = useSelector((state: any) => state.dataModelling.schema);
  const [selectedOption, setSelectedOption] = React.useState(undefined);
  const [createNewOpen, setCreateNewOpen] = React.useState(false);
  const [availableOptions, setAvailableOptions] = React.useState([]);

  const { data: jsonMetadata, isLoading: isLoadingJsonMetadata } =
    useGetMetadataQuery();
  const { data: xsdMetadata, isLoading: isLoadingXsdMetadata } =
    useGetMetadataXsdQuery();

  const uploadedOrCreatedFileName = React.useRef(null);
  const prevFetchedOption = React.useRef(null);

  const modelNames = (
    jsonMetadata?.map(({ label }: { label: string }) => label.toLowerCase()) ||
    []
  ).concat(
    xsdMetadata?.map(({ label }: { label: string }) => label.toLowerCase()),
  );

  useEffect(() => {
    if (isLoadingJsonMetadata || isLoadingXsdMetadata) {
      return;
    }
    const uniqueXsdOptions = xsdMetadata.filter((option) => {
      const modelName = option.value.fileName.replace(
        option.value.fileType,
        '',
      );
      return !jsonMetadata.find(
        (o) => o.value.fileName === `${modelName}.schema.json`,
      );
    });
    setAvailableOptions(jsonMetadata.concat(uniqueXsdOptions));
  }, [jsonMetadata, xsdMetadata, isLoadingJsonMetadata, isLoadingXsdMetadata]);

  useEffect(() => {
    if (isLoadingJsonMetadata || isLoadingXsdMetadata) {
      setSelectedOption(undefined);
    } else if (
      shouldSelectFirstEntry({
        metadataOptions: jsonMetadata,
        selectedOption,
        metadataLoadingState: !isLoadingJsonMetadata,
      })
    ) {
      setSelectedOption(jsonMetadata[0]);
    } else {
      const option = findPreferredMetadataOption(
        jsonMetadata,
        uploadedOrCreatedFileName.current,
      );
      if (option) {
        setSelectedOption(option);
        uploadedOrCreatedFileName.current = null;
      }
    }
  }, [
    jsonMetadata,
    selectedOption,
    isLoadingJsonMetadata,
    isLoadingXsdMetadata,
  ]);

  useEffect(() => {
    if (!schemaPathIsSame(prevFetchedOption?.current, selectedOption)) {
      dispatch(fetchDataModel({ metadata: selectedOption }));
      prevFetchedOption.current = selectedOption;
    }
  }, [selectedOption, dispatch]);

  const [landingDialogState, setLandingDialogState] =
    useState<LandingDialogState>(LandingDialogState.DatamodelsNotLoaded);

  const closeLandingPage = () =>
    setLandingDialogState(LandingDialogState.DialogShouldNotBeShown);

  useEffect(() => {
    if (!isLoadingJsonMetadata) {
      if (jsonMetadata && Object.keys(jsonMetadata).length) {
        setLandingDialogState(LandingDialogState.DialogShouldNotBeShown);
      } else if (
        landingDialogState === LandingDialogState.DatamodelsNotLoaded
      ) {
        setLandingDialogState(LandingDialogState.DialogIsVisible);
      }
    }
  }, [jsonMetadata, landingDialogState, isLoadingJsonMetadata]);

  const handleSaveSchema = (schema: any) =>
    dispatch(saveDataModel({ schema, metadata: selectedOption }));
  const handleDeleteSchema = () =>
    dispatch(deleteDataModel({ metadata: selectedOption }));
  const handleCreateNewFromLandingPage = () => setCreateNewOpen(true);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [createModelTrigger] = useCreateModelMutation();
  const handleCreateSchema = (model: {
    name: string;
    relativeDirectory?: string;
  }) => {
    createModelTrigger({ body: model });
    uploadedOrCreatedFileName.current = model.name;
  };

  const handleXSDUploaded = (filename: string) => {
    const lowerCaseFileName = filename.toLowerCase();
    const filenameWithoutXsd = lowerCaseFileName.split('.xsd')[0];
    const schemaName = filename.substr(0, filenameWithoutXsd.length);

    uploadedOrCreatedFileName.current = schemaName;
    dispatch(DataModelsMetadataActions.getDataModelsMetadata());
  };

  const shouldDisplayLandingPage =
    landingDialogState === LandingDialogState.DialogIsVisible;

  const [hideIntroPage, setHideIntroPage] = useState(
    () => getLocalStorageItem('hideIntroPage') ?? false,
  );
  const handleHideIntroPageButtonClick = () =>
    setHideIntroPage(setLocalStorageItem('hideIntroPage', true));

  const [editMode, setEditMode] = useState(() =>
    getLocalStorageItem('editMode'),
  );
  const toggleEditMode = () =>
    setEditMode(setLocalStorageItem('editMode', !editMode));

  const t = (key: string) => getLanguageFromKey(key, language);
  const saveModelUrl = sharedUrls().saveDataModelUrl(
    selectedOption?.value?.repositoryRelativeUrl,
  );

  return (
    <>
      <Dialog open={!hideIntroPage}>
        <Panel
          forceMobileLayout={true}
          title={t('schema_editor.info_dialog_title')}
        >
          <div>
            <p>{t('schema_editor.info_dialog_1')}</p>
            <p>{t('schema_editor.info_dialog_2')}</p>
            <p>
              {t('schema_editor.info_dialog_3')}{' '}
              <a href='https://docs.altinn.studio/app/development/data/data-model/'>
                {t('schema_editor.info_dialog_docs_link')}
              </a>
            </p>
          </div>
          <span className={classes.button}>
            <Button
              color={ButtonColor.Primary}
              onClick={() => setHideIntroPage(true)}
              variant={ButtonVariant.Outline}
            >
              Lukk
            </Button>
          </span>
          <span className={classes.button}>
            <Button
              color={ButtonColor.Secondary}
              onClick={handleHideIntroPageButtonClick}
              variant={ButtonVariant.Outline}
            >
              Ikke vis igjen
            </Button>
          </span>
        </Panel>
      </Dialog>
      <SchemaEditorApp
        editMode={editMode}
        toggleEditMode={toggleEditMode}
        language={language}
        schema={jsonSchema}
        onSaveSchema={handleSaveSchema}
        saveUrl={saveModelUrl}
        name={selectedOption?.label}
        loading={!(isLoadingJsonMetadata && isLoadingXsdMetadata)}
        LandingPagePanel={
          shouldDisplayLandingPage && (
            <LandingPagePanel
              language={language}
              org={org}
              repo={repo}
              handleXSDUploaded={handleXSDUploaded}
              handleCreateModelClick={handleCreateNewFromLandingPage}
              closeLandingPage={closeLandingPage}
            />
          )
        }
      >
        <CreateNewWrapper
          language={language}
          createAction={handleCreateSchema}
          dataModelNames={modelNames}
          createPathOption={createPathOption}
          disabled={shouldDisplayLandingPage}
          openByDefault={createNewOpen}
        />
        <XSDUpload
          language={language}
          onXSDUploaded={handleXSDUploaded}
          org={org}
          repo={repo}
          disabled={shouldDisplayLandingPage}
        />
        <SchemaSelect
          selectedOption={selectedOption}
          onChange={setSelectedOption}
          options={availableOptions}
          disabled={shouldDisplayLandingPage}
        />
        <DeleteWrapper
          schemaName={selectedOption?.value && selectedOption?.label}
          deleteAction={handleDeleteSchema}
          language={language}
        />
      </SchemaEditorApp>
    </>
  );
}

DataModelling.defaultProps = {
  createPathOption: false,
};
