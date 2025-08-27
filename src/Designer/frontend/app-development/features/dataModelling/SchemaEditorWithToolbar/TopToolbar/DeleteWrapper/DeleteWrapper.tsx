import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { TrashIcon } from 'libs/studio-icons/src';
import { useDeleteDataModelMutation } from '../../../../../hooks/mutations';
import type { MetadataOption } from '../../../../../types/MetadataOption';
import { AltinnConfirmDialog } from 'app-shared/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateBpmn } from 'app-shared/hooks/useUpdateBpmn';
import { removeDataTypeIdsToSign } from 'app-shared/utils/bpmnUtils';
import classes from './DeleteWrapper.module.css';

export interface DeleteWrapperProps {
  selectedOption: MetadataOption | null;
}

export function DeleteWrapper({ selectedOption }: DeleteWrapperProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { t } = useTranslation();
  const { mutate } = useDeleteDataModelMutation();
  const { org, app } = useStudioEnvironmentParams();
  const updateBpmn = useUpdateBpmn(org, app);

  const modelPath = selectedOption?.value.repositoryRelativeUrl;

  if (!modelPath) return null;

  const schemaName = selectedOption?.value && selectedOption?.label;
  const onDeleteClick = () => setDialogOpen(true);
  const onDeleteConfirmClick = async () => {
    mutate(modelPath, {
      onSuccess: async () => {
        await updateBpmn(removeDataTypeIdsToSign([schemaName]));
      },
    });
    setDialogOpen(false);
  };

  return (
    <AltinnConfirmDialog
      className={classes.popover}
      open={dialogOpen}
      confirmText={t('schema_editor.confirm_deletion')}
      onConfirm={onDeleteConfirmClick}
      onClose={() => setDialogOpen(false)}
      triggerProps={{
        id: 'delete-model-button',
        disabled: !schemaName,
        onClick: onDeleteClick,
        color: 'danger',
        icon: <TrashIcon />,
        variant: 'tertiary',
        children: t('schema_editor.delete_data_model'),
      }}
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
