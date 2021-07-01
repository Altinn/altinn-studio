import { Grid, Button } from '@material-ui/core';
import { AddCircleOutline } from '@material-ui/icons';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import AltinnPopoverSimple from 'app-shared/components/molecules/AltinnPopoverSimple';
import { getLanguageFromKey } from 'app-shared/utils/language';
import * as React from 'react';

interface ICreateNewWrapper {
  language: any,
  createAction: (modelName: string) => void,
  buttonClass: string,
  dataModelNames: string[],
}
export default function CreateNewWrapper(props: ICreateNewWrapper) {
  const [createButtonAnchor, setCreateButtonAnchor] = React.useState(null);
  const [newModelName, setNewModelName] = React.useState(null);
  const [nameError, setNameError] = React.useState('');

  const onCreateClick = (event: any) => {
    setCreateButtonAnchor(event.currentTarget);
  };
  const onNewModelNameChanged = (e: any) => {
    const name = e.target.value;
    if (!name.match(/^[a-zA-Z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/)) {
      setNameError('Invalid name');
    } else {
      setNameError('');
      setNewModelName(name);
    }
  };
  const onCreateConfirmClick = () => {
    if (newModelName && newModelName.length > 0) {
      if (props.dataModelNames.includes(newModelName.toLowerCase())) {
        setNameError(`A model with name ${newModelName} already exists.`);
        return;
      }
      props.createAction(newModelName);
      setCreateButtonAnchor(null);
      setNewModelName(null);
    }
  };
  const onCancelCreate = () => {
    setCreateButtonAnchor(null);
    setNewModelName(null);
  };
  return (
    <>
      <Grid item>
        <Button
          id='new-button'
          variant='contained'
          className={props.buttonClass}
          startIcon={<AddCircleOutline />}
          onClick={onCreateClick}
        >
          {getLanguageFromKey('general.create_new', props.language)}
        </Button>
      </Grid>
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
          inputFieldStyling={{ width: '250px' }}
          onChangeFunction={onNewModelNameChanged}
          onBtnClickFunction={onCreateConfirmClick}
        />
      </AltinnPopoverSimple>
    </>
  );
}
