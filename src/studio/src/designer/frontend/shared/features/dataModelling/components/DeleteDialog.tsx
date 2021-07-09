import * as React from 'react';
import Popover from '../../../components/AltinnPopover';
import { getLanguageFromKey, getParsedLanguageFromKey } from '../../../utils/language';

interface IDeleteDialogProps {
  anchor: Element,
  language: any,
  schemaName: string,
  onConfirm: () => void,
  onCancel: () => void,
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
