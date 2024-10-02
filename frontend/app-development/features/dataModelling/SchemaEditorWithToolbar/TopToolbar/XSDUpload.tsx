import React from 'react';
import type { StudioButtonProps } from '@studio/components';
import { StudioFileUploader, StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useUploadDataModelMutation } from '../../../../hooks/mutations/useUploadDataModelMutation';
import type { AxiosError } from 'axios';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { toast } from 'react-toastify';
import type { MetadataOption } from '../../../../types/MetadataOption';
import { fileSelectorInputId } from '@studio/testing/testids';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { useValidateFileName } from './useValidateFileName';
import { removeExtension } from 'app-shared/utils/filenameUtils';

export interface XSDUploadProps {
  selectedOption?: MetadataOption;
  uploadButtonText?: string;
  uploaderButtonVariant?: StudioButtonProps['variant'];
}

export const XSDUpload = ({
  selectedOption,
  uploadButtonText,
  uploaderButtonVariant,
}: XSDUploadProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const { mutate: uploadDataModel, isPending: uploading } = useUploadDataModelMutation(
    selectedOption?.value?.repositoryRelativeUrl,
    {
      hideDefaultError: (error: AxiosError<ApiError>) => !error.response?.data?.errorCode,
    },
  );
  const {
    validateFileName,
    getDuplicatedDataTypeIdNotBeingDataModelInAppMetadata,
    getDuplicatedDataModelIdsInAppMetadata,
  } = useValidateFileName(appMetadata);

  const uploadButton = React.useRef(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = (formData: FormData) => {
    uploadDataModel(formData, {
      onError: (error: AxiosError<ApiError>) => {
        if (!error.response?.data?.errorCode)
          toast.error(t('form_filler.file_uploader_validation_error_upload'));
      },
    });
  };

  const handleInvalidFileName = (file?: FormData, fileName?: string) => {
    const fileNameWithoutExtension = removeExtension(fileName);
    if (getDuplicatedDataModelIdsInAppMetadata(appMetadata, fileNameWithoutExtension)) {
      const userConfirmed = window.confirm(
        t('schema_editor.error_upload_data_model_id_exists_override_option'),
      );
      if (userConfirmed) {
        uploadDataModel(file);
      }
    }
    if (
      getDuplicatedDataTypeIdNotBeingDataModelInAppMetadata(appMetadata, fileNameWithoutExtension)
    ) {
      // Only show error if there are duplicates that does not have AppLogic.classRef
      toast.error(t('schema_editor.error_data_type_name_exists'));
    }
  };

  return (
    <span ref={uploadButton}>
      {uploading ? (
        <StudioSpinner spinnerTitle={t('app_data_modelling.uploading_xsd')} showSpinnerTitle />
      ) : (
        <StudioFileUploader
          onUploadFile={handleUpload}
          accept='.xsd'
          variant={uploaderButtonVariant}
          ref={fileInputRef}
          uploaderButtonText={uploadButtonText}
          customFileValidation={{
            validateFileName: validateFileName,
            onInvalidFileName: handleInvalidFileName,
          }}
          dataTestId={fileSelectorInputId}
        />
      )}
    </span>
  );
};
