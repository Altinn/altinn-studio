import { useDeleteDataModelMutation } from 'app-development/hooks/mutations';
import { useDataModelToolbarContext } from '../../../contexts/DataModelToolbarContext';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateBpmn } from 'app-shared/hooks/useUpdateBpmn';
import { removeDataTypeIdsToSign } from 'app-shared/utils/bpmnUtils';
import { StudioDeleteButton } from '@studio/components';
import React from 'react';

export const DeleteModelButton = () => {
  const { t } = useTranslation();
  const { selectedOption, selectedModelName } = useDataModelToolbarContext();
  const { mutate } = useDeleteDataModelMutation();
  const { org, app } = useStudioEnvironmentParams();
  const updateBpmn = useUpdateBpmn(org, app);

  const modelPath = selectedOption?.value.repositoryRelativeUrl;

  const handleDeleteModel = async () => {
    mutate(modelPath, {
      onSuccess: async () => {
        await updateBpmn(removeDataTypeIdsToSign([selectedModelName]));
      },
    });
  };

  return (
    <StudioDeleteButton
      onDelete={handleDeleteModel}
      confirmMessage={t('schema_editor.delete_model_confirm', { selectedModelName })} // Add a confirmation where you have to enter the data model's name to confirm
      size='small'
      title={t('general.delete')}
    >
      {t('general.delete')}
    </StudioDeleteButton>
  );
};
