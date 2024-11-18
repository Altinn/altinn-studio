import type { ChangeEvent, KeyboardEvent } from 'react';
import React, { useState } from 'react';
import classes from './CreateNewWrapper.module.css';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@studio/icons';
import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';
import { StudioButton, StudioPopover, StudioTextfield } from '@studio/components';
import { useValidateSchemaName } from '../../hooks/useValidateSchemaName';
import { useCreateDataModelMutation } from '../../../../hooks/mutations';

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
  const { t } = useTranslation();
  const [newModelName, setNewModelName] = useState('');
  const { validateName, nameError, setNameError } = useValidateSchemaName(dataModels);
  const { mutate: createDataModel } = useCreateDataModelMutation();

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
