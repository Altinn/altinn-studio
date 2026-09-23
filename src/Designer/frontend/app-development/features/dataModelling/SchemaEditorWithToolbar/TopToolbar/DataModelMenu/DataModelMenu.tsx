import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import type { AxiosError } from 'axios';
import { StudioDropdown } from '@studio/components';
import { ArrowsCirclepathIcon, MenuElipsisVerticalIcon, TrashIcon } from '@studio/icons';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateBpmn } from 'app-shared/hooks/useUpdateBpmn';
import { removeDataTypeIdsToSign } from 'app-shared/utils/bpmnUtils';
import type { MetadataOption } from '../../../../../types/MetadataOption';
import {
  useDeleteDataModelMutation,
  useReplaceDataModelXsdMutation,
} from '../../../../../hooks/mutations';

export interface DataModelMenuProps {
  selectedOption?: MetadataOption;
}

export const DataModelMenu = ({ selectedOption }: DataModelMenuProps): ReactElement | null => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const updateBpmn = useUpdateBpmn(org, app);
  const modelPath = selectedOption?.value.repositoryRelativeUrl;
  const { mutate: replaceDataModel, isPending: replacing } = useReplaceDataModelXsdMutation(
    modelPath,
    { hideDefaultError: (error: AxiosError<ApiError>) => !error.response?.data?.errorCode },
  );
  const { mutate: deleteDataModel } = useDeleteDataModelMutation();

  if (!modelPath) return null;

  const schemaName = selectedOption.label;

  const handleReplace = (file: File): void => {
    replaceDataModel(file, {
      onError: (error: AxiosError<ApiError>) => {
        if (!error.response?.data?.errorCode)
          toast.error(t('form_filler.file_uploader_validation_error_upload'));
      },
    });
  };

  const handleDelete = (): void => {
    const userConfirmed = window.confirm(t('schema_editor.delete_model_confirm', { schemaName }));
    if (!userConfirmed) return;

    deleteDataModel(modelPath, {
      onSuccess: async () => {
        await updateBpmn(removeDataTypeIdsToSign([schemaName]));
      },
    });
  };

  return (
    <StudioDropdown
      icon={<MenuElipsisVerticalIcon />}
      triggerButtonVariant='tertiary'
      triggerButtonAriaLabel={t('schema_editor.data_model_menu')}
    >
      <StudioDropdown.List>
        <StudioDropdown.Item>
          <StudioDropdown.FileUploaderButton
            icon={<ArrowsCirclepathIcon />}
            uploadButtonText={t('schema_editor.replace_data_model')}
            onFileUpload={handleReplace}
            fileInputProps={{ accept: '.xsd' }}
            disabled={replacing}
          />
        </StudioDropdown.Item>
        <StudioDropdown.Item>
          <StudioDropdown.Button data-color='danger' icon={<TrashIcon />} onClick={handleDelete}>
            {t('schema_editor.delete_data_model')}
          </StudioDropdown.Button>
        </StudioDropdown.Item>
      </StudioDropdown.List>
    </StudioDropdown>
  );
};
