import React, { useEffect, useState } from 'react';
import {
  Button,
  ButtonColor,
  ButtonVariant,
  ErrorMessage,
  TextField,
} from '@digdir/design-system-react';
import { AltinnPopoverSimple } from '../../../components/molecules/AltinnPopoverSimple';
import { useTranslation } from 'react-i18next';
import { Add } from '@navikt/ds-icons';

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
  openByDefault?: boolean;
}

export function CreateNewWrapper(props: ICreateNewWrapper) {
  const { t } = useTranslation();
  const [createButtonAnchor, setCreateButtonAnchor] = useState(null);
  const [newModelName, setNewModelName] = useState('');
  const [nameError, setNameError] = useState('');
  const [confirmedWithReturn, setConfirmedWithReturn] = useState(false);

  useEffect(() => {
    if (props.openByDefault) {
      setCreateButtonAnchor(document.getElementById('create-new-datamodel-button'));
    }
  }, [props.openByDefault]);

  const relativePath = props.createPathOption ? '' : undefined;
  const onCreateClick = (event: any) => {
    setCreateButtonAnchor(event.currentTarget);
  };
  const nameIsValid = () => newModelName.match(/^[a-zA-Z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/);
  const validateName = () => {
    setNameError(!nameIsValid() ? 'Invalid name' : '');
  };
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
    setCreateButtonAnchor(null);
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

  const onCancelCreate = () => {
    setCreateButtonAnchor(null);
    setNewModelName('');
    setNameError('');
  };
  return (
    <>
      <Button
        id='create-new-datamodel-button'
        onClick={onCreateClick}
        disabled={props.disabled}
        icon={<Add />}
      >
        {t('general.create_new')}
      </Button>
      {createButtonAnchor && (
        <AltinnPopoverSimple
          open={!!createButtonAnchor}
          anchorEl={createButtonAnchor}
          handleClose={onCancelCreate}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
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
        </AltinnPopoverSimple>
      )}
    </>
  );
}
CreateNewWrapper.defaultProps = {
  createPathOption: false,
};
