import React, { useEffect } from 'react';
import classes from './TopToolbar.module.css';
import { CreateNewWrapper } from './CreateNewWrapper';
import { XSDUpload } from './XSDUpload';
import { SchemaSelect } from './SchemaSelect';
import { DeleteWrapper } from './DeleteWrapper';
import { computeSelectedOption } from '../../../../utils/metadataUtils';
import type { CreateDatamodelMutationArgs } from '../../../../hooks/mutations/useCreateDatamodelMutation';
import { useCreateDatamodelMutation } from '../../../../hooks/mutations';
import type { MetadataOption } from '../../../../types/MetadataOption';
import { GenerateModelsButton } from './GenerateModelsButton';
import { usePrevious } from '@studio/components';
import type { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';

export interface TopToolbarProps {
  createNewOpen: boolean;
  createPathOption?: boolean;
  dataModels: DatamodelMetadata[];
  selectedOption?: MetadataOption;
  setCreateNewOpen: (open: boolean) => void;
  setSelectedOption: (option?: MetadataOption) => void;
  onSetSchemaGenerationErrorMessages: (errorMessages: string[]) => void;
}

export function TopToolbar({
  createNewOpen,
  createPathOption,
  dataModels,
  selectedOption,
  setCreateNewOpen,
  setSelectedOption,
  onSetSchemaGenerationErrorMessages,
}: TopToolbarProps) {
  const modelPath = selectedOption?.value.repositoryRelativeUrl;

  const { mutate: createDatamodel } = useCreateDatamodelMutation();
  const prevDataModels = usePrevious(dataModels);

  useEffect(() => {
    setSelectedOption(computeSelectedOption(selectedOption, dataModels, prevDataModels));
  }, [selectedOption, dataModels, prevDataModels, setSelectedOption]);

  const handleCreateSchema = (model: CreateDatamodelMutationArgs) => {
    createDatamodel(model);
    setCreateNewOpen(false);
  };

  return (
    <section className={classes.toolbar} role='toolbar'>
      <CreateNewWrapper
        dataModels={dataModels}
        disabled={false}
        createNewOpen={createNewOpen}
        setCreateNewOpen={setCreateNewOpen}
        handleCreateSchema={handleCreateSchema}
        createPathOption={createPathOption}
      />
      <XSDUpload disabled={false} />
      <SchemaSelect
        datamodels={dataModels}
        disabled={false}
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
      />
      <DeleteWrapper selectedOption={selectedOption} />
      <div className={classes.right}>
        <div className={classes.generateButtonWrapper}>
          {modelPath && (
            <GenerateModelsButton
              modelPath={modelPath}
              onSetSchemaGenerationErrorMessages={(errorMessages: string[]) =>
                onSetSchemaGenerationErrorMessages(errorMessages)
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}
