import { Button } from '@material-ui/core';
import { AddCircleOutline } from '@material-ui/icons';
import * as React from 'react';
import AltinnInputField from '../../../components/AltinnInputField';
import AltinnPopoverSimple from '../../../components/molecules/AltinnPopoverSimple';
import { getLanguageFromKey } from '../../../utils/language';

interface ICreateNewWrapper {
  language: any,
  createAction: (modelName: string) => void,
  dataModelNames: string[],
}
export default function CreateNewWrapper(props: ICreateNewWrapper) {
  const [createButtonAnchor, setCreateButtonAnchor] = React.useState(null);
  const [newModelName, setNewModelName] = React.useState('');
  const [nameError, setNameError] = React.useState('');
  const [confirmedWithReturn, setConfirmedWithReturn] = React.useState(false);

  const onCreateClick = (event: any) => {
    setCreateButtonAnchor(event.currentTarget);
  };
  const nameIsValid = () => newModelName.match(/^[a-zA-Z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/);
  const validateName = () => { setNameError(!nameIsValid() ? 'Invalid name' : ''); };
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
    props.createAction(newModelName);
    setCreateButtonAnchor(null);
    setNewModelName('');
    setNameError('');
  };
  const onReturnButtonConfirm = () => {
    validateName();
    onCreateConfirmClick();
    setConfirmedWithReturn(true);
  };
  const onCancelCreate = () => {
    setCreateButtonAnchor(null);
    setNewModelName('');
    setNameError('');
  };
  return (
    <>
      <Button
        id='new-button'
        variant='contained'
        startIcon={<AddCircleOutline />}
        onClick={onCreateClick}
      >
        {getLanguageFromKey('general.create_new', props.language)}
      </Button>
      {createButtonAnchor &&
        <AltinnPopoverSimple
          anchorEl={createButtonAnchor}
          handleClose={onCancelCreate}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <AltinnInputField
            id='newModelInput'
            placeholder='Name'
            btnText='Ok'
            error={nameError}
            clearError={() => setNameError('')}
            inputFieldStyling={{ width: '250px' }}
            onChangeFunction={onNameChange}
            onBlurFunction={onInputBlur}
            onBtnClickFunction={onCreateConfirmClick}
            onReturn={onReturnButtonConfirm}
          />
        </AltinnPopoverSimple>}
    </>
  );
}
