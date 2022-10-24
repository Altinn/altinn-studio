import React, { useEffect, useState } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { Button, ButtonVariant, Panel } from '@altinn/altinn-design-system';
import { SchemaEditorApp } from '@altinn/schema-editor/index';
import type { ILanguage } from '@altinn/schema-editor/types';
import { createDataModel, deleteDataModel, fetchDataModel, saveDataModel } from './sagas';
import { createDataModelMetadataOptions } from './functions/createDataModelMetadataOptions';
import { findPreferredMetadataOption } from './functions/findPreferredMetadataOption';
import { schemaPathIsSame } from './functions/schemaPathIsSame';
import { DataModelsMetadataActions, LoadingState } from './sagas/metadata';
import type { IMetadataOption } from './functions/types';
import { LandingPagePanel } from './components/LandingPagePanel';
import { Dialog } from '@mui/material';
import { createStyles, makeStyles } from '@mui/styles';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { getLocalStorageItem, setLocalStorageItem } from 'app-shared/features/dataModelling/functions/localStorage';
import { CreateNewWrapper } from './components/CreateNewWrapper';
import { DeleteWrapper } from 'app-shared/features/dataModelling/components/DeleteWrapper';
import { SchemaSelect } from 'app-shared/features/dataModelling/components/SchemaSelect';
import { XSDUpload } from 'app-shared/features/dataModelling/components/XSDUpload';
import { sharedUrls } from 'app-shared/utils/urlHelper';

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
    metadataOptions?.length > 0 && selectedOption === undefined && metadataLoadingState === LoadingState.ModelsLoaded
  );
};

const useStyles = makeStyles(
  createStyles({
    button: {
      marginRight: 16,
    },
  }),
);

export function DataModelling({ language, org, repo, createPathOption }: IDataModellingContainerProps): JSX.Element {
  const classes = useStyles();
  const dispatch = useDispatch();
  const jsonSchema = useSelector((state: any) => state.dataModelling.schema);
  const metadataOptions = useSelector(createDataModelMetadataOptions, shallowEqual);
  const metadataLoadingState = useSelector((state: any) => state.dataModelsMetadataState.loadState);
  const [selectedOption, setSelectedOption] = React.useState(undefined);
  const [createNewOpen, setCreateNewOpen] = React.useState(false);

  const uploadedOrCreatedFileName = React.useRef(null);
  const prevFetchedOption = React.useRef(null);

  const modelNames = metadataOptions?.map(({ label }: { label: string }) => label.toLowerCase()) || [];

  useEffect(() => {
    if (metadataLoadingState === LoadingState.LoadingModels) {
      setSelectedOption(undefined);
    } else if (
      shouldSelectFirstEntry({
        metadataOptions,
        selectedOption,
        metadataLoadingState,
      })
    ) {
      setSelectedOption(metadataOptions[0]);
    } else {
      const option = findPreferredMetadataOption(metadataOptions, uploadedOrCreatedFileName.current);
      if (option) {
        setSelectedOption(option);
        uploadedOrCreatedFileName.current = null;
      }
    }
  }, [metadataOptions, selectedOption, metadataLoadingState]);

  useEffect(() => {
    if (!schemaPathIsSame(prevFetchedOption?.current, selectedOption)) {
      dispatch(fetchDataModel({ metadata: selectedOption }));
      prevFetchedOption.current = selectedOption;
    }
  }, [selectedOption, dispatch]);

  const [landingDialogState, setLandingDialogState] = useState<LandingDialogState>(
    LandingDialogState.DatamodelsNotLoaded,
  );

  const closeLandingPage = () => setLandingDialogState(LandingDialogState.DialogShouldNotBeShown);

  useEffect(() => {
    if (metadataLoadingState === LoadingState.ModelsLoaded) {
      if (jsonSchema && Object.keys(jsonSchema).length) {
        setLandingDialogState(LandingDialogState.DialogShouldNotBeShown);
      } else if (landingDialogState === LandingDialogState.DatamodelsNotLoaded) {
        setLandingDialogState(LandingDialogState.DialogIsVisible);
      }
    }
  }, [jsonSchema, landingDialogState, metadataLoadingState]);

  const handleSaveSchema = (schema: any) => dispatch(saveDataModel({ schema, metadata: selectedOption }));
  const handleDeleteSchema = () => dispatch(deleteDataModel({ metadata: selectedOption }));
  const handleCreateNewFromLandingPage = () => setCreateNewOpen(true);

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

  const shouldDisplayLandingPage = landingDialogState === LandingDialogState.DialogIsVisible;

  const [hideIntroPage, setHideIntroPage] = useState(() => getLocalStorageItem('hideIntroPage') ?? false);
  const handleHideIntroPageButtonClick = () => setHideIntroPage(setLocalStorageItem('hideIntroPage', true));

  const [editMode, setEditMode] = useState(() => getLocalStorageItem('editMode'));
  const toggleEditMode = () => setEditMode(setLocalStorageItem('editMode', !editMode));

  const t = (key: string) => getLanguageFromKey(key, language);
  const saveModelUrl = sharedUrls().saveDataModelUrl(selectedOption?.value?.repositoryRelativeUrl);

  return (
    <>
      <Dialog open={!hideIntroPage}>
        <Panel forceMobileLayout={true} title={t('schema_editor.info_dialog_title')}>
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
            <Button onClick={() => setHideIntroPage(true)}>Lukk</Button>
          </span>
          <span className={classes.button}>
            <Button onClick={handleHideIntroPageButtonClick} variant={ButtonVariant.Secondary}>
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
        loading={metadataLoadingState === LoadingState.LoadingModels}
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
          options={metadataOptions}
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
