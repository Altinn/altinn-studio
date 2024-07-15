import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';
import { TrashIcon } from '@studio/icons';
import { useDeleteDataModelMutation } from '../../../../hooks/mutations';
import type { MetadataOption } from '../../../../types/MetadataOption';
import { AltinnConfirmDialog } from 'app-shared/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useRemoveDataTypesToSignFromSigningTasks } from '@altinn/ux-editor/hooks/mutations/useRemoveDataTypesToSignFromSigningTasks';
export interface DeleteWrapperProps {
  selectedOption: MetadataOption | null;
}

export function DeleteWrapper({ selectedOption }: DeleteWrapperProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { t } = useTranslation();
  const { mutate } = useDeleteDataModelMutation();
  const { org, app } = useStudioEnvironmentParams();
  const removeDataTypesToSignFromSigningTasks = useRemoveDataTypesToSignFromSigningTasks(org, app);

  const modelPath = selectedOption?.value.repositoryRelativeUrl;

  if (!modelPath) return null;

  const schemaName = selectedOption?.value && selectedOption?.label;
  const onDeleteClick = () => setDialogOpen(true);
  const onDeleteConfirmClick = async () => {
    mutate(modelPath, {
      onSuccess: async () => {
        await removeDataTypesToSignFromSigningTasks([schemaName]);
      },
    });
    setDialogOpen(false);
  };

  return (
    <AltinnConfirmDialog
      open={dialogOpen}
      confirmText={t('schema_editor.confirm_deletion')}
      onConfirm={onDeleteConfirmClick}
      onClose={() => setDialogOpen(false)}
      trigger={
        <StudioButton
          id='delete-model-button'
          disabled={!schemaName}
          onClick={onDeleteClick}
          color='danger'
          icon={<TrashIcon />}
          variant='tertiary'
          size='small'
        >
          {t('schema_editor.delete_data_model')}
        </StudioButton>
      }
    >
      <p>
        <Trans
          i18nKey={'schema_editor.delete_model_confirm'}
          values={{ schemaName }}
          components={{ bold: <strong /> }}
        />
      </p>
    </AltinnConfirmDialog>
  );
}
