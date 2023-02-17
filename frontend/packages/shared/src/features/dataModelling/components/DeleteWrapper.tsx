import React from 'react';
import { TopToolbarButton } from '@altinn/schema-editor/index';
import { DeleteDialog } from './DeleteDialog';
import classes from './DeleteWrapper.module.css';
import { useTranslation } from 'react-i18next';

export interface IDeleteWrapper {
  deleteAction: () => void;
  schemaName: string;
}

export function DeleteWrapper(props: IDeleteWrapper) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { t } = useTranslation();
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
          {t('general.delete_data_model')}
        </TopToolbarButton>
      )}
      schemaName={props.schemaName}
      onConfirm={onDeleteConfirmClick}
      onCancel={onCancelDelete}
      open={dialogOpen}
    />
  );
}
