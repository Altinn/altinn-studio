import React, { useState } from 'react';
import classes from './CreateNewWrapper.module.css';
import { ErrorMessage, Textfield } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@studio/icons';
import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';
import { StudioButton, StudioPopover } from '@studio/components';
import { useValidateSchemaName } from './useValidateSchemaName';

export interface CreateNewWrapperProps {
  disabled: boolean;
  createNewOpen: boolean;
  createPathOption?: boolean;
  dataModels: DataModelMetadata[];
  setCreateNewOpen: (open: boolean) => void;
  handleCreateSchema: (props: { name: string; relativePath: string | undefined }) => void;
}

export function CreateNewWrapper({
  disabled,
  createPathOption = false,
  createNewOpen,
  dataModels,
  setCreateNewOpen,
  handleCreateSchema,
}: CreateNewWrapperProps) {
  const { t } = useTranslation();
  const [newModelName, setNewModelName] = useState('');
  const { validateName, nameError } = useValidateSchemaName(dataModels);

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
  };

  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onCreateConfirmClick();
    }
  };

  return (
    <StudioPopover open={createNewOpen} onOpenChange={setCreateNewOpen}>
      <StudioPopover.Trigger
        id='create-new-data-model-button'
        disabled={disabled}
        variant='tertiary'
        onClick={() => setCreateNewOpen(!createNewOpen)}
        size='small'
      >
        {<PlusIcon />}
        {t('general.create_new')}
      </StudioPopover.Trigger>
      <StudioPopover.Content className={classes.popoverContent}>
        <Textfield
          id='newModelInput'
          label={t('schema_editor.create_model_description')}
          onChange={onNameChange}
          onKeyUp={onKeyUp}
          error={nameError && <ErrorMessage>{nameError}</ErrorMessage>}
        />
        <StudioButton
          color='second'
          onClick={onCreateConfirmClick}
          disabled={!newModelName || !!nameError}
          style={{ marginTop: 22 }}
          variant='secondary'
          size='small'
        >
          {t('schema_editor.create_model_confirm_button')}
        </StudioButton>
      </StudioPopover.Content>
    </StudioPopover>
  );
}
