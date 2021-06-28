import * as React from 'react';
import Popover from 'app-shared/components/AltinnPopover';
import { getLanguageFromKey, getParsedLanguageFromKey } from 'app-shared/utils/language'

interface IDeleteDialogProps {
  anchor: any,
  language: any,
  schemaName: any,
  onConfirm: any;
  onCancel: any
}

export default function DeleteDialog(props: IDeleteDialogProps) {
  const description = getParsedLanguageFromKey(
    'administration.delete_model_confirm', props.language, [props.schemaName], true,
  );
  return (<Popover
    anchorEl={props.anchor}
    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    btnCancelText={getLanguageFromKey('general.cancel', props.language)}
    descriptionText={description}
    btnConfirmText={getLanguageFromKey('general.continue', props.language)}
    btnPrimaryId='confirm-delete-button'
    btnClick={props.onConfirm}
    handleClose={props.onCancel}
    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
  />);
}
