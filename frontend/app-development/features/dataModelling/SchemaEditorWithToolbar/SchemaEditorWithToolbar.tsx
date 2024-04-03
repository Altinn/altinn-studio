import classes from './SchemaEditorWithToolbar.module.css';
import { TopToolbar } from './TopToolbar';
import { LandingPagePanel } from './LandingPagePanel';
import React, { useState } from 'react';
import type { MetadataOption } from '../../../types/MetadataOption';
import { SelectedSchemaEditor } from './SelectedSchemaEditor';
import type { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';
import { SchemaGenerationErrorsPanel } from './SchemaGenerationErrorsPanel';

export interface SchemaEditorWithToolbarProps {
  createPathOption?: boolean;
  datamodels: DatamodelMetadata[];
}

export const SchemaEditorWithToolbar = ({
  createPathOption,
  datamodels,
}: SchemaEditorWithToolbarProps) => {
  const [createNewOpen, setCreateNewOpen] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<MetadataOption | undefined>(undefined);
  const [schemaGenerationErrorMessages, setSchemaGenerationErrorMessages] = useState<string[]>([]);

  const modelPath = selectedOption?.value.repositoryRelativeUrl;

  return (
    <div className={classes.root}>
      <TopToolbar
        createNewOpen={createNewOpen}
        createPathOption={createPathOption}
        datamodels={datamodels}
        selectedOption={selectedOption}
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
        {!datamodels.length && <LandingPagePanel openCreateNew={() => setCreateNewOpen(true)} />}
        {modelPath && <SelectedSchemaEditor modelPath={modelPath} />}
      </main>
    </div>
  );
};
