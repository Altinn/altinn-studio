import React, { MutableRefObject, useEffect, useRef } from 'react';
import classes from './TopToolbar.module.css';
import { useDatamodelsMetadataQuery } from '@altinn/schema-editor/hooks/queries';
import { useCreateDatamodelMutation } from '@altinn/schema-editor/hooks/mutations';
import { CreateNewWrapper } from './CreateNewWrapper';
import { XSDUpload } from './XSDUpload';
import { SchemaSelect } from './SchemaSelect';
import { DeleteWrapper } from './DeleteWrapper';
import { convertMetadataListToOptionGroups } from '@altinn/schema-editor/utils/metadataUtils';
import { CreateDatamodelMutationArgs } from '@altinn/schema-editor/hooks/mutations/useCreateDatamodelMutation';
import { MetadataOptionsGroup } from '@altinn/schema-editor/types/MetadataOptionsGroup';
import { MetadataOption } from '@altinn/schema-editor/types/MetadataOption';
import { QueryStatus } from '@tanstack/react-query';
import { findPreferredMetadataOption } from '@altinn/schema-editor/utils/findPreferredMetadataOption';
import { schemaPathIsSame } from '@altinn/schema-editor/utils/schemaPathIsSame';
import { useParams } from 'react-router-dom';
import { SelectedSchemaContext } from '@altinn/schema-editor/contexts/SelectedSchemaContext';
import { GenerateModelsButton } from '@altinn/schema-editor/components/TopToolbar/GenerateModelsButton';
import { removeExtension } from 'app-shared/utils/filenameUtils';

export interface TopToolbarProps {
  createNewOpen: boolean;
  createPathOption?: boolean;
  selectedOption?: MetadataOption;
  setCreateNewOpen: (open: boolean) => void;
  setSelectedOption: (option?: MetadataOption) => void;
  uploadedOrCreatedFileName: MutableRefObject<string | null>;
}

type ShouldSelectFirstEntryProps = {
  metadataOptions?: MetadataOptionsGroup[];
  selectedOption?: MetadataOption;
  metadataStatus: QueryStatus;
};

export const shouldSelectFirstEntry = ({
  metadataOptions,
  selectedOption,
  metadataStatus,
}: ShouldSelectFirstEntryProps) =>
  metadataOptions?.length > 0 &&
  selectedOption === undefined &&
  metadataStatus === 'success';

export function TopToolbar({
  createNewOpen,
  createPathOption,
  selectedOption,
  setCreateNewOpen,
  setSelectedOption,
  uploadedOrCreatedFileName,
}: TopToolbarProps) {
  const modelPath = selectedOption?.value.repositoryRelativeUrl;
  const { org, app } = useParams<{ org: string; app: string }>();

  const { data: metadataItems, status: metadataStatus } = useDatamodelsMetadataQuery();
  const { mutate: createDatamodel } = useCreateDatamodelMutation();
  const metadataOptions = metadataItems && convertMetadataListToOptionGroups(metadataItems);

  const prevFetchedOption = useRef(null);

  useEffect(() => {
    if (metadataStatus === 'loading') {
      setSelectedOption(undefined);
    } else if (
      shouldSelectFirstEntry({
        metadataOptions,
        selectedOption,
        metadataStatus,
      })
    ) {
      setSelectedOption(metadataOptions[0].options[0]);
    } else {
      const option = findPreferredMetadataOption(
        metadataOptions,
        uploadedOrCreatedFileName.current
      );
      if (option) {
        setSelectedOption(option);
        uploadedOrCreatedFileName.current = null;
      }
    }
  }, [metadataOptions, selectedOption, metadataStatus]);

  useEffect(() => {
    if (!schemaPathIsSame(prevFetchedOption?.current, selectedOption)) {
      prevFetchedOption.current = selectedOption;
      const { fileName } = selectedOption.value;
      if (fileName.endsWith('.xsd')) {
        uploadedOrCreatedFileName.current = removeExtension(fileName);
      }
    }
  }, [selectedOption, org, app]);

  const resetPrevFetchedOption = () => {
    // Needs to reset prevFetchedOption when deleting the data model.
    prevFetchedOption.current = null;
  };

  const handleCreateSchema = (model: CreateDatamodelMutationArgs) => {
    createDatamodel(model);
    uploadedOrCreatedFileName.current = model.name;
    setCreateNewOpen(false);
  };

  return (
    <section className={classes.toolbar} role='toolbar'>
      <CreateNewWrapper
        disabled={false}
        createNewOpen={createNewOpen}
        setCreateNewOpen={setCreateNewOpen}
        handleCreateSchema={handleCreateSchema}
        createPathOption={createPathOption}
      />
      <XSDUpload disabled={false} uploadedOrCreatedFileName={uploadedOrCreatedFileName}/>
      <SchemaSelect
        disabled={false}
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
      />
      {modelPath && (
        <SelectedSchemaContext.Provider value={{ modelPath }}>
          <DeleteWrapper
            resetPrevFetchedOption={resetPrevFetchedOption}
            selectedOption={selectedOption}
          />
        </SelectedSchemaContext.Provider>
      )}
      <div className={classes.right}>
        <div className={classes.generateButtonWrapper}>
          {modelPath && (
            <SelectedSchemaContext.Provider value={{ modelPath }}>
              <GenerateModelsButton/>
            </SelectedSchemaContext.Provider>
          )}
        </div>
      </div>
    </section>
  );
}
