import React, { useState } from 'react';
import { ErrorMessage, Textfield } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@studio/icons';
import { extractModelNamesFromMetadataList } from '../../../../utils/metadataUtils';
import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';
import { StudioButton, StudioPopover } from '@studio/components';

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
  const [nameError, setNameError] = useState('');
  const [confirmedWithReturn, setConfirmedWithReturn] = useState(false);

  const modelNames = extractModelNamesFromMetadataList(dataModels);

  const relativePath = createPathOption ? '' : undefined;

  const nameIsValid = () => newModelName.match(/^[a-zA-Z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/);
  const validateName = () => setNameError(!nameIsValid() ? 'Invalid name' : '');

  const onInputBlur = () => {
    if (confirmedWithReturn) {
      setConfirmedWithReturn(false);
      return;
    }
    validateName();
  };
  const onNameChange = (e: any) => {
    const name = e.target.value || '';
    if (nameError) {
      setNameError('');
    }
    setNewModelName(name);
  };
  const onCreateConfirmClick = () => {
    if (nameError || !newModelName || !nameIsValid()) {
      return;
    }
    if (modelNames.includes(newModelName)) {
      setNameError(t('schema_editor.error_model_name_exists', { newModelName }));
      return;
    }
    handleCreateSchema({
      name: newModelName,
      relativePath,
    });
    setNewModelName('');
    setNameError('');
  };
  const handleReturnButtonConfirm = () => {
    validateName();
    onCreateConfirmClick();
    setConfirmedWithReturn(true);
  };
  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleReturnButtonConfirm();
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
      <StudioPopover.Content>
        <Textfield
          id='newModelInput'
          label={t('schema_editor.create_model_description')}
          onChange={onNameChange}
          onBlur={onInputBlur}
          onKeyUp={onKeyUp}
          error={nameError && <ErrorMessage>{nameError}</ErrorMessage>}
        />
        <StudioButton
          color='second'
          onClick={onCreateConfirmClick}
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
