import React, { useEffect } from 'react';
import classes from './TopToolbar.module.css';
import { CreateNewWrapper } from './CreateNewWrapper';
import { XSDUpload } from './XSDUpload';
import { SchemaSelect } from './SchemaSelect';
import { DeleteWrapper } from './DeleteWrapper';
import { computeSelectedOption } from '../../../../utils/metadataUtils';
import {
  CreateDatamodelMutationArgs,
  useCreateDatamodelMutation
} from '../../../../hooks/mutations/useCreateDatamodelMutation';
import { MetadataOption } from '../../../../types/MetadataOption';
import { GenerateModelsButton } from './GenerateModelsButton';
import { usePrevious } from 'app-shared/hooks/usePrevious';
import { useDatamodelsMetadataQuery } from '../../../../hooks/queries';

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
      <DeleteWrapper selectedOption={selectedOption}/>
      <div className={classes.right}>
        <div className={classes.generateButtonWrapper}>
          {modelPath && <GenerateModelsButton modelPath={modelPath}/>}
        </div>
      </div>
    </section>
  );
}
