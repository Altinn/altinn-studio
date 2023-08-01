import React from 'react';
import { DeleteDialog } from './DeleteDialog';
import { useTranslation } from 'react-i18next';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { TrashIcon } from '@navikt/aksel-icons';
import { useDeleteDatamodelMutation } from '@altinn/schema-editor/hooks/mutations';
import { MetadataOption } from '@altinn/schema-editor/types/MetadataOption';

export interface DeleteWrapperProps {
  resetPrevFetchedOption: () => void;
  selectedOption: MetadataOption | null;
}

export function DeleteWrapper({ resetPrevFetchedOption, selectedOption }: DeleteWrapperProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { t } = useTranslation();
  const { mutate } = useDeleteDatamodelMutation();

  const schemaName = selectedOption?.value && selectedOption?.label;
  const onDeleteClick = () => setDialogOpen(true);
  const onDeleteConfirmClick = () => {
    mutate();
    resetPrevFetchedOption();
    setDialogOpen(false);
  };
  const onCancelDelete = () => setDialogOpen(false);

  return (
    <DeleteDialog
      trigger={
        <Button
          id='delete-model-button'
          disabled={!schemaName}
          onClick={onDeleteClick}
          color={ButtonColor.Danger}
          icon={<TrashIcon />}
          variant={ButtonVariant.Quiet}
        >
          {t('general.delete_data_model')}
        </Button>
      }
      schemaName={schemaName}
      onConfirm={onDeleteConfirmClick}
      onCancel={onCancelDelete}
      open={dialogOpen}
    />
  );
}
