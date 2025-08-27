import type { ChangeEvent, KeyboardEvent } from 'react';
import React, { useState } from 'react';
import classes from './CreateNewWrapper.module.css';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from 'libs/studio-icons/src';
import { StudioButton, StudioPopover, StudioTextfield } from '@studio/components-legacy';
import { useValidateSchemaName } from 'app-shared/hooks/useValidateSchemaName';
import { useCreateDataModelMutation } from '../../../../../hooks/mutations';
import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';
import { extractModelNamesFromMetadataList } from '../../../../../utils/metadataUtils';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { extractDataTypeNamesFromAppMetadata } from '../utils/validationUtils';

export interface CreateNewWrapperProps {
  disabled: boolean;
  isCreateNewOpen: boolean;
  createPathOption?: boolean;
  dataModels: DataModelMetadata[];
  setIsCreateNewOpen: (open: boolean) => void;
}

export function CreateNewWrapper({
  disabled,
  createPathOption = false,
  isCreateNewOpen,
  dataModels,
  setIsCreateNewOpen,
}: CreateNewWrapperProps) {
  const { org, app } = useStudioEnvironmentParams();
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const { mutate: createDataModel } = useCreateDataModelMutation();
  const dataModelNames = extractModelNamesFromMetadataList(dataModels);
  const dataTypeNames = extractDataTypeNamesFromAppMetadata(appMetadata);
  const { validateName, nameError, setNameError } = useValidateSchemaName(
    dataModelNames,
    dataTypeNames,
  );
  const [newModelName, setNewModelName] = useState('');
  const { t } = useTranslation();

  const isConfirmButtonActivated = newModelName && !nameError;
  const relativePath = createPathOption ? '' : undefined;

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value || '';
    setNewModelName(name);
    validateName(name);
  };

  const handleConfirm = () => {
    createDataModel({
      name: newModelName,
      relativePath,
    });

    handleOpenChange();
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && isConfirmButtonActivated) {
      handleConfirm();
    }
  };

  const handleOpenChange = () => {
    setIsCreateNewOpen(!isCreateNewOpen);
    setNewModelName('');
    setNameError('');
  };

  return (
    <StudioPopover open={isCreateNewOpen} onClose={handleOpenChange}>
      <StudioPopover.Trigger
        id='create-new-data-model-button'
        disabled={disabled}
        variant='tertiary'
        onClick={handleOpenChange}
        size='small'
      >
        {<PlusIcon />}
        {t('general.create_new')}
      </StudioPopover.Trigger>
      <StudioPopover.Content className={classes.popover}>
        <StudioTextfield
          id='newModelInput'
          label={t('schema_editor.create_model_description')}
          onChange={handleNameChange}
          onKeyUp={handleKeyUp}
          error={nameError}
          autoFocus
        />
        <StudioButton
          color='second'
          onClick={handleConfirm}
          disabled={!isConfirmButtonActivated}
          variant='secondary'
          size='small'
        >
          {t('schema_editor.create_model_confirm_button')}
        </StudioButton>
      </StudioPopover.Content>
    </StudioPopover>
  );
}
