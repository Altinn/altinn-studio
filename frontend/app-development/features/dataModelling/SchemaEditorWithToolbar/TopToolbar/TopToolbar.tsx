import React, { useEffect } from 'react';
import classes from './TopToolbar.module.css';
import { CreateNewWrapper } from './CreateNewWrapper';
import { XSDUpload } from './XSDUpload';
import { SchemaSelect } from './SchemaSelect';
import { DeleteWrapper } from './DeleteWrapper';
import { computeSelectedOption } from '../../../../utils/metadataUtils';
import type { CreateDataModelMutationArgs } from '../../../../hooks/mutations/useCreateDataModelMutation';
import { useCreateDataModelMutation } from '../../../../hooks/mutations';
import type { MetadataOption } from '../../../../types/MetadataOption';
import { GenerateModelsButton } from './GenerateModelsButton';
import { usePrevious } from '@studio/components';
import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';

export interface TopToolbarProps {
  createNewOpen: boolean;
  createPathOption?: boolean;
  dataModels: DataModelMetadata[];
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

  const { mutate: createDataModel } = useCreateDataModelMutation();
  const prevDataModels = usePrevious(dataModels);

  useEffect(() => {
    setSelectedOption(computeSelectedOption(selectedOption, dataModels, prevDataModels));
  }, [selectedOption, dataModels, prevDataModels, setSelectedOption]);

  const handleCreateSchema = (model: CreateDataModelMutationArgs) => {
    createDataModel(model);
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
        dataModels={dataModels}
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
