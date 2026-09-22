import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import type { AxiosError } from 'axios';
import { StudioDropdown } from '@studio/components';
import { ArrowsCirclepathIcon, MenuElipsisVerticalIcon } from '@studio/icons';
import type { ApiError } from 'app-shared/types/api/ApiError';
import type { MetadataOption } from '../../../../../types/MetadataOption';
import { useReplaceDataModelXsdMutation } from '../../../../../hooks/mutations';
import { DeleteWrapper } from '../DeleteWrapper';

export interface DataModelMenuProps {
  selectedOption?: MetadataOption;
}

export const DataModelMenu = ({ selectedOption }: DataModelMenuProps): ReactElement | null => {
  const { t } = useTranslation();
  const modelPath = selectedOption?.value.repositoryRelativeUrl;
  const { mutate: replaceDataModel, isPending: replacing } = useReplaceDataModelXsdMutation(
    modelPath,
    { hideDefaultError: (error: AxiosError<ApiError>) => !error.response?.data?.errorCode },
  );

  if (!modelPath) return null;

  const handleReplace = (file: File): void => {
    replaceDataModel(file, {
      onError: (error: AxiosError<ApiError>) => {
        if (!error.response?.data?.errorCode)
          toast.error(t('form_filler.file_uploader_validation_error_upload'));
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
          <DeleteWrapper selectedOption={selectedOption} />
        </StudioDropdown.Item>
      </StudioDropdown.List>
    </StudioDropdown>
  );
};
