import React from 'react';
import { DeleteDialog } from './DeleteDialog';
import { useTranslation } from 'react-i18next';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { TrashIcon } from '@navikt/aksel-icons';

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
      trigger={
        <Button
          id='delete-model-button'
          disabled={!props.schemaName}
          onClick={onDeleteClick}
          color={ButtonColor.Danger}
          icon={<TrashIcon />}
          variant={ButtonVariant.Quiet}
        >
          {t('general.delete_data_model')}
        </Button>
      }
      schemaName={props.schemaName}
      onConfirm={onDeleteConfirmClick}
      onCancel={onCancelDelete}
      open={dialogOpen}
    />
  );
}
