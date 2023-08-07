import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import classes from './SchemaEditor.module.css';
import {
  setSchemaName,
  setUiSchema,
} from '../features/editor/schemaEditorSlice';
import { TopToolbar } from './TopToolbar/TopToolbar';
import { LandingPagePanel } from '@altinn/schema-editor/components/LandingPagePanel';
import { SelectedSchemaEditor } from '@altinn/schema-editor/components/SelectedSchemaEditor';
import { MetadataOption } from '@altinn/schema-editor/types/MetadataOption';
import { SelectedSchemaContext } from '@altinn/schema-editor/contexts/SelectedSchemaContext';

export interface IEditorProps {
  createPathOption?: boolean;
  displayLandingPage?: boolean;
}

export enum SchemaEditorTestIds {
  menuAddReference = 'action-menu-add-reference',
  menuAddField = 'action-menu-add-field',
  menuAddCombination = 'action-menu-add-combination',
  menuAddString = 'action-menu-add-string',
  menuAddInteger = 'action-menu-add-integer',
  menuAddNumber = 'action-menu-add-number',
  menuAddBoolean = 'action-menu-add-boolean',
}

export const SchemaEditor = ({ createPathOption, displayLandingPage }: IEditorProps) => {
  const dispatch = useDispatch();
  const [createNewOpen, setCreateNewOpen] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<MetadataOption | undefined>(undefined);

  const uploadedOrCreatedFileName = useRef(null);

  const modelName = selectedOption?.label;
  const modelPath = selectedOption?.value.repositoryRelativeUrl;

  useEffect(() => {
    if (modelName) {
      dispatch(setUiSchema({ name: modelName }));
      dispatch(setSchemaName({ name: modelName }));
    }
  }, [dispatch, modelName]);

  return (
    <div className={classes.root}>
      <TopToolbar
        createNewOpen={createNewOpen}
        createPathOption={createPathOption}
        selectedOption={selectedOption}
        setCreateNewOpen={setCreateNewOpen}
        setSelectedOption={setSelectedOption}
        uploadedOrCreatedFileName={uploadedOrCreatedFileName}
      />
      <main className={classes.main}>
        {displayLandingPage && (
          <LandingPagePanel
            openCreateNew={() => setCreateNewOpen(true)}
            uploadedOrCreatedFileName={uploadedOrCreatedFileName}
          />
        )}
        {modelPath && (
          <SelectedSchemaContext.Provider value={{ modelPath }}>
            <SelectedSchemaEditor/>
          </SelectedSchemaContext.Provider>
        )}
      </main>
    </div>
  );
};
