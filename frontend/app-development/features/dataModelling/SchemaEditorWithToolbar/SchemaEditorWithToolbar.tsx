import classes from './SchemaEditorWithToolbar.module.css';
import { TopToolbar } from './TopToolbar';
import { LandingPagePanel } from './LandingPagePanel';
import React, { useState } from 'react';
import { MetadataOption } from '../../../types/MetadataOption';
import { SelectedSchemaEditor } from './SelectedSchemaEditor';
import { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';

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

  const modelPath = selectedOption?.value.repositoryRelativeUrl;
  const modelName = selectedOption?.label;

  return (
    <div className={classes.root}>
      <TopToolbar
        createNewOpen={createNewOpen}
        createPathOption={createPathOption}
        datamodels={datamodels}
        selectedOption={selectedOption}
        setCreateNewOpen={setCreateNewOpen}
        setSelectedOption={setSelectedOption}
      />
      <main className={classes.main}>
        {!datamodels.length && <LandingPagePanel openCreateNew={() => setCreateNewOpen(true)} />}
        {modelPath && (
          <SelectedSchemaEditor
            datamodels={datamodels}
            modelName={modelName}
            modelPath={modelPath}
          />
        )}
      </main>
    </div>
  );
};
