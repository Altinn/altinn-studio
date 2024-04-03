import React, { useState } from 'react';
import { ErrorMessage, Textfield, LegacyPopover } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@navikt/aksel-icons';
import { extractModelNamesFromMetadataList } from '../../../../utils/metadataUtils';
import type { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';
import { StudioButton } from '@studio/components';

export interface CreateNewWrapperProps {
  disabled: boolean;
  createNewOpen: boolean;
  createPathOption?: boolean;
  datamodels: DatamodelMetadata[];
  setCreateNewOpen: (open: boolean) => void;
  handleCreateSchema: (props: { name: string; relativePath: string | undefined }) => void;
}

export function CreateNewWrapper({
  disabled,
  createPathOption,
  createNewOpen,
  datamodels,
  setCreateNewOpen,
  handleCreateSchema,
}: CreateNewWrapperProps) {
  const { t } = useTranslation();
  const [newModelName, setNewModelName] = useState('');
  const [nameError, setNameError] = useState('');
  const [confirmedWithReturn, setConfirmedWithReturn] = useState(false);

  const modelNames = extractModelNamesFromMetadataList(datamodels);

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
    <LegacyPopover
      open={createNewOpen}
      onOpenChange={setCreateNewOpen}
      trigger={
        <StudioButton
          id='create-new-datamodel-button'
          disabled={disabled}
          icon={<PlusIcon />}
          variant='tertiary'
          onClick={() => setCreateNewOpen(!createNewOpen)}
          size='small'
        >
          {t('general.create_new')}
        </StudioButton>
      }
    >
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
    </LegacyPopover>
  );
}
CreateNewWrapper.defaultProps = {
  createPathOption: false,
};
