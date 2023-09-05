import classes from './SchemaEditorWithToolbar.module.css';
import { TopToolbar } from './TopToolbar';
import { LandingPagePanel } from './LandingPagePanel';
import React, { useState } from 'react';
import { MetadataOption } from '../../../types/MetadataOption';
import { SelectedSchemaEditor } from './SelectedSchemaEditor';

export interface SchemaEditorWithToolbarProps {
  createPathOption?: boolean;
  displayLandingPage?: boolean;
}

export const SchemaEditorWithToolbar = ({
  createPathOption,
  displayLandingPage
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
        selectedOption={selectedOption}
        setCreateNewOpen={setCreateNewOpen}
        setSelectedOption={setSelectedOption}
      />
      <main className={classes.main}>
        {displayLandingPage && (
          <LandingPagePanel
            openCreateNew={() => setCreateNewOpen(true)}
          />
        )}
        {modelPath && <SelectedSchemaEditor modelName={modelName} modelPath={modelPath}/>}
      </main>
    </div>
  );
}
