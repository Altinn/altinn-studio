import React, { useState } from 'react';
import { ErrorMessage, Textfield } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@studio/icons';
import { extractModelNamesFromMetadataList } from '../../../../utils/metadataUtils';
import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';
import { StudioButton, StudioPopover } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';

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

  const { org, app } = useStudioEnvironmentParams();
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const modelNames = extractModelNamesFromMetadataList(dataModels);

  const relativePath = createPathOption ? '' : undefined;

  const onNameChange = (e: any) => {
    const name = e.target.value || '';
    setNewModelName(name);
    validateName(name);
  };

  const dataTypeWithNameExists = (id: string) => {
    return appMetadata.dataTypes?.find(
      (dataType) => dataType.id.toLowerCase() === id.toLowerCase(),
    );
  };

  const nameValidationRegex = /^[a-zA-Z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/;
  const validateName = (name: string) => {
    if (!name || !name.match(nameValidationRegex)) {
      setNameError(t('schema_editor.invalid_datamodel_name'));
      return;
    }
    if (modelNames.includes(name)) {
      setNameError(t('schema_editor.error_model_name_exists', { newModelName: name }));
      return;
    }
    if (dataTypeWithNameExists(name)) {
      setNameError(t('schema_editor.error_data_type_name_exists'));
      return;
    }
    setNameError('');
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
