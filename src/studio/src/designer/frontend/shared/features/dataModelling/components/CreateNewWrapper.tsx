import { TopToolbarButton } from '@altinn/schema-editor/index';
import React from 'react';
import {Button, TextField} from '@altinn/altinn-design-system';
import AltinnPopoverSimple from '../../../components/molecules/AltinnPopoverSimple';
import { getLanguageFromKey } from '../../../utils/language';

export interface ICreateNewWrapper {
  language: any;
  createAction: ({
    name,
    relativePath,
  }: {
    name: string;
    relativePath: string | undefined;
  }) => void;
  dataModelNames: string[];
  createPathOption?: boolean;
}

export default function CreateNewWrapper(props: ICreateNewWrapper) {
  const t = (key: string) => getLanguageFromKey(key, props.language);
  const [createButtonAnchor, setCreateButtonAnchor] = React.useState(null);
  const [newModelName, setNewModelName] = React.useState('');
  const [nameError, setNameError] = React.useState('');
  const [confirmedWithReturn, setConfirmedWithReturn] = React.useState(false);
  const relativePath = props.createPathOption ? '' : undefined;
  const onCreateClick = (event: any) => {
    setCreateButtonAnchor(event.currentTarget);
  };
  const nameIsValid = () =>
    newModelName.match(/^[a-zA-Z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/);
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

  const onCancelCreate = () => {
    setCreateButtonAnchor(null);
    setNewModelName('');
    setNameError('');
  };
  return (
    <>
      <TopToolbarButton
        faIcon='fa fa-plus'
        onClick={onCreateClick}
        hideText={false}
      >
        {t('general.create_new')}
      </TopToolbarButton>
      {createButtonAnchor && (
        <AltinnPopoverSimple
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
          />
          <Button
            onClick={onCreateConfirmClick}
            style={{marginTop: 22}}
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
