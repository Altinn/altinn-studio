import { Button, Grid } from '@material-ui/core';
import { DeleteOutline } from '@material-ui/icons';
import * as React from 'react';
import { getLanguageFromKey } from '../../../utils/language';
import DeleteDialog from './DeleteDialog';

interface IDeleteWrapper {
  language: any;
  deleteAction: () => void;
  schemaName: string;
  buttonClass: string;
}

export default function DeleteWrapper(props: IDeleteWrapper) {
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
      <Grid item>
        <Button
          disabled={!props.schemaName}
          id='delete-button'
          variant='contained'
          className={props.buttonClass}
          startIcon={<DeleteOutline />}
          onClick={onDeleteClick}
        >
          {getLanguageFromKey('general.delete', props.language)}
        </Button>
      </Grid>
      { deleteButtonAnchor && <DeleteDialog
        anchor={deleteButtonAnchor}
        language={props.language}
        schemaName={props.schemaName}
        onConfirm={onDeleteConfirmClick}
        onCancel={onCancelDelete}
      /> }
    </>
  );
}
