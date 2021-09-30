import { TopToolbarButton } from '@altinn/schema-editor/index';
import { DeleteOutline } from '@material-ui/icons';
import * as React from 'react';
import { getLanguageFromKey } from '../../../utils/language';
import DeleteDialog from './DeleteDialog';

interface IDeleteWrapper {
  language: any;
  deleteAction: () => void;
  schemaName: string;
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
      <TopToolbarButton
        disabled={!props.schemaName}
        startIcon={<DeleteOutline />}
        onClick={onDeleteClick}
        hideText
        warning
      >
        {getLanguageFromKey('general.delete', props.language)}
      </TopToolbarButton>
      {deleteButtonAnchor && <DeleteDialog
        anchor={deleteButtonAnchor}
        language={props.language}
        schemaName={props.schemaName}
        onConfirm={onDeleteConfirmClick}
        onCancel={onCancelDelete}
      />}
    </>
  );
}
