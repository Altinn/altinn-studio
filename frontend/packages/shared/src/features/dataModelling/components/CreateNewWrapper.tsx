import React, { useState } from 'react';
import {
  Button,
  ButtonColor,
  ButtonVariant,
  ErrorMessage,
  TextField,
  Popover,
} from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@navikt/aksel-icons';

export interface ICreateNewWrapper {
  createAction: ({
    name,
    relativePath,
  }: {
    name: string;
    relativePath: string | undefined;
  }) => void;
  dataModelNames: string[];
  createPathOption?: boolean;
  disabled: boolean;
  open?: boolean;
  setOpen: (open: boolean) => void;
}

export function CreateNewWrapper(props: ICreateNewWrapper) {
  const { t } = useTranslation();
  const [newModelName, setNewModelName] = useState('');
  const [nameError, setNameError] = useState('');
  const [confirmedWithReturn, setConfirmedWithReturn] = useState(false);

  const relativePath = props.createPathOption ? '' : undefined;

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
    if (props.dataModelNames.includes(newModelName)) {
      setNameError(`A model with name ${newModelName} already exists.`);
      return;
    }
    props.createAction({
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
    <Popover
      open={props.open}
      onOpenChange={(open) => props.setOpen(open)}
      trigger={
        <Button
          id='create-new-datamodel-button'
          disabled={props.disabled}
          icon={<PlusIcon />}
          variant={ButtonVariant.Quiet}
          onClick={() => props.setOpen(!props.open)}
        >
          {t('general.create_new')}
        </Button>
      }
    >
      <label>{t('schema_editor.create_model_description')}</label>
      <TextField
        id='newModelInput'
        placeholder={t('schema_editor.name')}
        isValid={!nameError}
        onChange={onNameChange}
        onBlur={onInputBlur}
        onKeyUp={onKeyUp}
      />
      {nameError && <ErrorMessage>{t(nameError)}</ErrorMessage>}
      <Button
        color={ButtonColor.Secondary}
        onClick={onCreateConfirmClick}
        style={{ marginTop: 22 }}
        variant={ButtonVariant.Outline}
      >
        {t('schema_editor.create_model_confirm_button')}
      </Button>
    </Popover>
  );
}
CreateNewWrapper.defaultProps = {
  createPathOption: false,
};
