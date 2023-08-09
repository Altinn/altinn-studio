import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { TrashIcon } from '@navikt/aksel-icons';
import { useDeleteDatamodelMutation } from '@altinn/schema-editor/hooks/mutations';
import { MetadataOption } from '@altinn/schema-editor/types/MetadataOption';
import { AltinnConfirmDialog } from 'app-shared/components';

export interface DeleteWrapperProps {
  selectedOption: MetadataOption | null;
}

export function DeleteWrapper({ selectedOption }: DeleteWrapperProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { t } = useTranslation();
  const { mutate } = useDeleteDatamodelMutation();

  const schemaName = selectedOption?.value && selectedOption?.label;
  const onDeleteClick = () => setDialogOpen(true);
  const onDeleteConfirmClick = () => {
    mutate();
    setDialogOpen(false);
  };

  return (
    <AltinnConfirmDialog
      open={dialogOpen}
      confirmText={t('schema_editor.confirm_deletion')}
      onConfirm={onDeleteConfirmClick}
      onClose={() => setDialogOpen(false)}
      placement="bottom"
      trigger={
        <Button
          id='delete-model-button'
          disabled={!schemaName}
          onClick={onDeleteClick}
          color={ButtonColor.Danger}
          icon={<TrashIcon />}
          variant={ButtonVariant.Quiet}
        >
          {t('schema_editor.delete_data_model')}
        </Button>
      }
    >
      <p>{t('schema_editor.delete_model_confirm', { schemaName })}</p>
    </AltinnConfirmDialog>
  );
}
