import { TopToolbarButton } from '@altinn/schema-editor/index';
import * as React from 'react';
import AltinnInputField from '../../../components/AltinnInputField';
import AltinnPopoverSimple from '../../../components/molecules/AltinnPopoverSimple';
import { getLanguageFromKey } from '../../../utils/language';

interface ICreateNewWrapper {
  language: any,
  createAction: ({ name, relativePath }: { name: string, relativePath: string | undefined }) => void,
  dataModelNames: string[],
  createPathOption?: boolean;
}

export default function CreateNewWrapper(props: ICreateNewWrapper) {
  const [createButtonAnchor, setCreateButtonAnchor] = React.useState(null);
  const [newModelName, setNewModelName] = React.useState('');
  const [nameError, setNameError] = React.useState('');
  const [confirmedWithReturn, setConfirmedWithReturn] = React.useState(false);
  const relativePath = props.createPathOption ? '' : undefined;
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
    props.createAction({
      name: newModelName,
      relativePath,
    });
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
      <TopToolbarButton
        faIcon='fa fa-plus'
        onClick={onCreateClick}
        hideText={true}
      >
        {getLanguageFromKey('general.create_new', props.language)}
      </TopToolbarButton>
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
CreateNewWrapper.defaultProps = {
  createPathOption: false,
};
