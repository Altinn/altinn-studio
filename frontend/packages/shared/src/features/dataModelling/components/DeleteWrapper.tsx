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
  const [deleteButtonAnchor, setDeleteButtonAnchor] = React.useState(null);
  const onDeleteClick = (event: any) => {
    setDeleteButtonAnchor(event.currentTarget);
  };
  const onDeleteConfirmClick = () => {
    props.deleteAction();
    setDeleteButtonAnchor(null);
  };
  const onCancelDelete = () => {
    setDeleteButtonAnchor(null);
  };

  return (
    <>
      <TopToolbarButton
        id='delete-model-button'
        disabled={!props.schemaName}
        faIcon='ai ai-trash'
        iconSize={24}
        onClick={onDeleteClick}
        warning
        className={classes.root}
      >
        {getLanguageFromKey('general.delete', props.language)}
      </TopToolbarButton>
      {deleteButtonAnchor && (
        <DeleteDialog
          anchor={deleteButtonAnchor}
          language={props.language}
          schemaName={props.schemaName}
          onConfirm={onDeleteConfirmClick}
          onCancel={onCancelDelete}
        />
      )}
    </>
  );
}
