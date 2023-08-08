import React, { useEffect } from 'react';
import classes from './TopToolbar.module.css';
import { useDatamodelsMetadataQuery } from '@altinn/schema-editor/hooks/queries';
import { useCreateDatamodelMutation } from '@altinn/schema-editor/hooks/mutations';
import { CreateNewWrapper } from './CreateNewWrapper';
import { XSDUpload } from './XSDUpload';
import { SchemaSelect } from './SchemaSelect';
import { DeleteWrapper } from './DeleteWrapper';
import { computeSelectedOption } from '@altinn/schema-editor/utils/metadataUtils';
import { CreateDatamodelMutationArgs } from '@altinn/schema-editor/hooks/mutations/useCreateDatamodelMutation';
import { MetadataOption } from '@altinn/schema-editor/types/MetadataOption';
import { SelectedSchemaContext } from '@altinn/schema-editor/contexts/SelectedSchemaContext';
import { GenerateModelsButton } from '@altinn/schema-editor/components/TopToolbar/GenerateModelsButton';
import { usePrevious } from 'app-shared/hooks/usePrevious';

export interface TopToolbarProps {
  createNewOpen: boolean;
  createPathOption?: boolean;
  selectedOption?: MetadataOption;
  setCreateNewOpen: (open: boolean) => void;
  setSelectedOption: (option?: MetadataOption) => void;
}

export function TopToolbar({
  createNewOpen,
  createPathOption,
  selectedOption,
  setCreateNewOpen,
  setSelectedOption,
}: TopToolbarProps) {
  const modelPath = selectedOption?.value.repositoryRelativeUrl;

  const { data: metadataItems  } = useDatamodelsMetadataQuery();
  const { mutate: createDatamodel } = useCreateDatamodelMutation();
  const prevMetadataItems = usePrevious(metadataItems);

  useEffect(() => {
    setSelectedOption(computeSelectedOption(selectedOption, metadataItems, prevMetadataItems));
  });

  const handleCreateSchema = (model: CreateDatamodelMutationArgs) => {
    createDatamodel(model);
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
      <XSDUpload disabled={false}/>
      <SchemaSelect
        disabled={false}
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
      />
      {modelPath && (
        <SelectedSchemaContext.Provider value={{ modelPath }}>
          <DeleteWrapper
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
