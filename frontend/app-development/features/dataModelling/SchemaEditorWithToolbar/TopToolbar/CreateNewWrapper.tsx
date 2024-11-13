import React, { useState } from 'react';
import classes from './TopToolbar.module.css';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@studio/icons';
import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';
import { StudioButton, StudioPopover, StudioTextfield } from '@studio/components';
import { useValidateSchemaName } from './useValidateSchemaName';
import cn from 'classnames';

export interface CreateNewWrapperProps {
  disabled: boolean;
  isCreateNewOpen: boolean;
  createPathOption?: boolean;
  dataModels: DataModelMetadata[];
  setIsCreateNewOpen: (open: boolean) => void;
  handleCreateSchema: (props: { name: string; relativePath: string | undefined }) => void;
}

export function CreateNewWrapper({
  disabled,
  createPathOption = false,
  isCreateNewOpen,
  dataModels,
  setIsCreateNewOpen,
  handleCreateSchema,
}: CreateNewWrapperProps) {
  const { t } = useTranslation();
  const [newModelName, setNewModelName] = useState('');
  const { validateName, nameError, setNameError } = useValidateSchemaName(dataModels);

  const relativePath = createPathOption ? '' : undefined;

  const onNameChange = (e: any) => {
    const name = e.target.value || '';
    setNewModelName(name);
    validateName(name);
  };

  const onCreateConfirmClick = () => {
    handleCreateSchema({
      name: newModelName,
      relativePath,
    });
    setNewModelName('');
    setNameError('');
  };

  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onCreateConfirmClick();
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
      <StudioPopover.Content className={cn(classes.popover, classes.createNewPopover)}>
        <StudioTextfield
          id='newModelInput'
          label={t('schema_editor.create_model_description')}
          onChange={onNameChange}
          onKeyUp={onKeyUp}
          error={nameError}
          autoFocus
        />
        <StudioButton
          color='second'
          onClick={onCreateConfirmClick}
          disabled={!newModelName || !!nameError}
          variant='secondary'
          size='small'
        >
          {t('schema_editor.create_model_confirm_button')}
        </StudioButton>
      </StudioPopover.Content>
    </StudioPopover>
  );
}
