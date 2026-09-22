import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@studio/icons';
import { StudioDropdown } from '@studio/components';
import { useDeleteDataModelMutation } from '../../../../../hooks/mutations';
import type { MetadataOption } from '../../../../../types/MetadataOption';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateBpmn } from 'app-shared/hooks/useUpdateBpmn';
import { removeDataTypeIdsToSign } from 'app-shared/utils/bpmnUtils';

export interface DeleteWrapperProps {
  selectedOption: MetadataOption;
}

export function DeleteWrapper({ selectedOption }: DeleteWrapperProps) {
  const { t } = useTranslation();
  const { mutate } = useDeleteDataModelMutation();
  const { org, app } = useStudioEnvironmentParams();
  const updateBpmn = useUpdateBpmn(org, app);

  const modelPath = selectedOption.value.repositoryRelativeUrl;
  const schemaName = selectedOption.label;

  const handleDeleteClick = (): void => {
    const userConfirmed = window.confirm(t('schema_editor.delete_model_confirm', { schemaName }));
    if (!userConfirmed) return;

    mutate(modelPath, {
      onSuccess: async () => {
        await updateBpmn(removeDataTypeIdsToSign([schemaName]));
      },
    });
  };

  return (
    <StudioDropdown.Button
      id='delete-model-button'
      data-color='danger'
      icon={<TrashIcon />}
      onClick={handleDeleteClick}
    >
      {t('schema_editor.delete_data_model')}
    </StudioDropdown.Button>
  );
}
