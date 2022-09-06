import React from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { SchemaEditorApp } from '@altinn/schema-editor/index';
import type { ILanguage } from '@altinn/schema-editor/types';
import {
  deleteDataModel,
  fetchDataModel,
  createDataModel,
  saveDataModel,
} from './sagas';
import { Create, Delete, SchemaSelect, XSDUpload } from './components';
import createDataModelMetadataOptions from './functions/createDataModelMetadataOptions';
import findPreferredMetadataOption from './functions/findPreferredMetadataOption';
import schemaPathIsSame from './functions/schemaPathIsSame';
import { DataModelsMetadataActions, LoadingState } from './sagas/metadata';
import type { IMetadataOption } from './functions/types';
import { Dialog, makeStyles } from "@material-ui/core";
import { AltinnButton } from "app-shared/components";
import { getLanguageFromKey } from "app-shared/utils/language";

const useStyles = makeStyles({
  landingDialog: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    '& [role="dialog"]': {
      backgroundColor: '#E3F7FF',
      borderRadius: 0,
      boxShadow: '1px 1px 3px 2px rgb(0 0 0 / 25%)',
      padding: '3rem'
    },
    '& h1': {
      fontSize: 18,
      fontWeight: 'bold'
    }
  },
  buttons: {
    display: 'flex',
    '& > :first-child button': {
      marginRight: '2rem',
      overflow: 'hidden', // Without this, the :before symbol makes the focus outline look weird
      '&:before': {
        content: '"\\f02f"',
        fontFamily: 'AltinnStudio',
        fontSize: '4rem',
        marginRight: '1rem'
      }
    },
    '& > :last-child': {
      backgroundColor: "#FFF",
      border: '2px solid #50ABDD',
      color: '#50ABDD',
      transition: 'none',
      '& .MuiButton-label span': {
        borderBottomWidth: 0
      },
      '&:hover': {
        borderColor: '#0062BA',
        color: '#0062BA'
      }
    }
  }
});

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
    metadataOptions?.length > 0 &&
    selectedOption === undefined &&
    metadataLoadingState === LoadingState.ModelsLoaded
  );
};

function DataModelling({
  language,
  org,
  repo,
  createPathOption,
}: IDataModellingContainerProps): JSX.Element {

  const classes = useStyles();

  const dispatch = useDispatch();
  const jsonSchema = useSelector((state: any) => state.dataModelling.schema);
  const metadataOptions = useSelector(
    createDataModelMetadataOptions,
    shallowEqual,
  );
  const metadataLoadingState = useSelector(
    (state: any) => state.dataModelsMetadataState.loadState,
  );
  const [selectedOption, setSelectedOption] = React.useState(undefined);

  const uploadedOrCreatedFileName = React.useRef(null);
  const prevFetchedOption = React.useRef(null);

  const modelNames =
    metadataOptions?.map(({ label }: { label: string }) =>
      label.toLowerCase(),
    ) || [];

  React.useEffect(() => {
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
      const option = findPreferredMetadataOption(
        metadataOptions,
        uploadedOrCreatedFileName.current,
      );
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

  const [landingDialogState, setLandingDialogState] =
    React.useState<LandingDialogState>(LandingDialogState.DatamodelsNotLoaded);

  const closeLandingpage = () => setLandingDialogState(LandingDialogState.DialogShouldNotBeShown);

  React.useEffect(
    () => {
      if (metadataLoadingState === LoadingState.ModelsLoaded) {
        if (jsonSchema && Object.keys(jsonSchema).length) {
          setLandingDialogState(LandingDialogState.DialogShouldNotBeShown);
        } else if (landingDialogState === LandingDialogState.DatamodelsNotLoaded) {
          setLandingDialogState(LandingDialogState.DialogIsVisible);
        }
      }
    },
    [jsonSchema, landingDialogState, metadataLoadingState]
  );

  const handleSaveSchema = (schema: any) => {
    dispatch(saveDataModel({ schema, metadata: selectedOption }));
  };

  const handleDeleteSchema = () => {
    dispatch(deleteDataModel({ metadata: selectedOption }));
  };

  const handleCreateSchema = (model: {
    name: string;
    relativeDirectory?: string;
  }) => {
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
    <>
      {landingDialogState === LandingDialogState.DialogIsVisible && (
        <Dialog
          open={true}
          className={classes.landingDialog}
          hideBackdrop={true}
        >
          <h1>{getLanguageFromKey('app_data_modelling.landing_dialog_header', language)}</h1>
          <p>{getLanguageFromKey('app_data_modelling.landing_dialog_paragraph', language)}</p>
          <div className={classes.buttons}>
            <XSDUpload
              language={language}
              onXSDUploaded={(filename) => {
                handleXSDUploaded(filename);
                closeLandingpage();
              }}
              org={org}
              repo={repo}
              submitButtonRenderer={(fileInputClickHandler) => (
                <AltinnButton
                  onClickFunction={fileInputClickHandler}
                  btnText={getLanguageFromKey('app_data_modelling.landing_dialog_upload', language)}
                />
              )}
            />
            <AltinnButton
              btnText={getLanguageFromKey('app_data_modelling.landing_dialog_create', language)}
              secondaryButton
              onClickFunction={closeLandingpage}
            />
          </div>
        </Dialog>
      )}
      <SchemaEditorApp
        language={language}
        schema={jsonSchema}
        onSaveSchema={handleSaveSchema}
        name={selectedOption?.label}
        loading={metadataLoadingState === LoadingState.LoadingModels}
      >
        <Create
          language={language}
          createAction={handleCreateSchema}
          dataModelNames={modelNames}
          createPathOption={createPathOption}
        />
        <XSDUpload
          language={language}
          onXSDUploaded={handleXSDUploaded}
          org={org}
          repo={repo}
        />
        <SchemaSelect
          selectedOption={selectedOption}
          onChange={setSelectedOption}
          options={metadataOptions}
        />
        <Delete
          schemaName={selectedOption?.value && selectedOption?.label}
          deleteAction={handleDeleteSchema}
          language={language}
        />
      </SchemaEditorApp>
    </>
  );
}
export default DataModelling;

DataModelling.defaultProps = {
  createPathOption: false,
};
