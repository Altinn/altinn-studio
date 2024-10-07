import classes from './SchemaEditorWithToolbar.module.css';
import { TopToolbar } from './TopToolbar';
import { LandingPagePanel } from './LandingPagePanel';
import React, { useEffect, useState } from 'react';
import type { MetadataOption } from '../../../types/MetadataOption';
import { SelectedSchemaEditor } from './SelectedSchemaEditor';
import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';
import { SchemaGenerationErrorsPanel } from './SchemaGenerationErrorsPanel';
import { useAddXsdMutation } from '../../../hooks/mutations/useAddXsdMutation';
import { isXsdFile } from 'app-shared/utils/filenameUtils';

export interface SchemaEditorWithToolbarProps {
  createPathOption?: boolean;
  dataModels: DataModelMetadata[];
}

export const SchemaEditorWithToolbar = ({
  createPathOption,
  dataModels,
}: SchemaEditorWithToolbarProps) => {
  const [createNewOpen, setCreateNewOpen] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<MetadataOption | undefined>(undefined);
  const [schemaGenerationErrorMessages, setSchemaGenerationErrorMessages] = useState<string[]>([]);
  const { mutate: addXsdFromRepo } = useAddXsdMutation();

  const existingSelectedOption = dataModels.some(
    (model) => model.fileName === selectedOption?.value.fileName,
  )
    ? selectedOption
    : undefined;
  const modelPath = existingSelectedOption?.value?.repositoryRelativeUrl;

  useEffect(() => {
    dataModels.forEach((model) => {
      if (model.repositoryRelativeUrl && isXsdFile(model.repositoryRelativeUrl)) {
        addXsdFromRepo(model.repositoryRelativeUrl);
      }
    });
  }, [dataModels, addXsdFromRepo]);

  return (
    <div className={classes.root}>
      <TopToolbar
        createNewOpen={createNewOpen}
        createPathOption={createPathOption}
        dataModels={dataModels}
        selectedOption={existingSelectedOption}
        setCreateNewOpen={setCreateNewOpen}
        setSelectedOption={setSelectedOption}
        onSetSchemaGenerationErrorMessages={(errorMessages: string[]) =>
          setSchemaGenerationErrorMessages(errorMessages)
        }
      />
      {schemaGenerationErrorMessages.length > 0 && (
        <SchemaGenerationErrorsPanel
          onCloseErrorsPanel={() => setSchemaGenerationErrorMessages([])}
          schemaGenerationErrorMessages={schemaGenerationErrorMessages}
        />
      )}
      <main className={classes.main}>
        {!dataModels.length && <LandingPagePanel openCreateNew={() => setCreateNewOpen(true)} />}
        {modelPath && <SelectedSchemaEditor modelPath={modelPath} />}
      </main>
    </div>
  );
};
