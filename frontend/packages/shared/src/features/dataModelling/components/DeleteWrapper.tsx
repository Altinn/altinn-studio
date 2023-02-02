import React from 'react';
import { TopToolbarButton } from '@altinn/schema-editor/index';
import { getLanguageFromKey } from '../../../utils/language';
import { DeleteDialog } from './DeleteDialog';
import classes from './DeleteWrapper.module.css';

export interface IDeleteWrapper {
  language: any;
  deleteAction: () => void;
  schemaName: string;
}

export function DeleteWrapper(props: IDeleteWrapper) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const onDeleteClick = () => setDialogOpen(true);
  const onDeleteConfirmClick = () => {
    props.deleteAction();
    setDialogOpen(false);
  };
  const onCancelDelete = () => setDialogOpen(false);

  return (
    <DeleteDialog
      trigger={(
        <TopToolbarButton
          id='delete-model-button'
          disabled={!props.schemaName}
          faIcon='ai ai-trash'
          iconSize={24}
          onClick={onDeleteClick}
          warning
          className={classes.root}
        >
          {getLanguageFromKey('general.delete_data_model', props.language)}
        </TopToolbarButton>
      )}
      language={props.language}
      schemaName={props.schemaName}
      onConfirm={onDeleteConfirmClick}
      onCancel={onCancelDelete}
      open={dialogOpen}
    />
  );
}
