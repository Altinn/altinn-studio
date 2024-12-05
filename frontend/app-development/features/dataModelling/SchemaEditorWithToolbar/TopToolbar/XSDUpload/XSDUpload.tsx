import React from 'react';
import type { StudioButtonProps } from '@studio/components';
import { StudioFileUploader, StudioSpinner } from '@studio/components';
import { FileNameUtils } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';
import { useUploadDataModelMutation } from '../../../../../hooks/mutations/useUploadDataModelMutation';
import type { AxiosError } from 'axios';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { toast } from 'react-toastify';
import type { MetadataOption } from '../../../../../types/MetadataOption';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { useValidationAlert } from './useValidationAlert';
import {
  doesFileExistInMetadataWithClassRef,
  doesFileExistInMetadataWithoutClassRef,
  findFileNameError,
} from '../utils/validationUtils';
import type { FileNameError } from '../types/FileNameError';

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
  const validationAlert = useValidationAlert();

  const uploadButton = React.useRef(null);

  const handleSubmit = (file: File): void => {
    const fileNameError = findFileNameError(file.name, appMetadata);
    if (fileNameError) {
      handleInvalidFileName(file, fileNameError);
      uploadButton.current.value = '';
    } else {
      handleUpload(file);
    }
  };

  const handleUpload = (file: File): void => {
    uploadDataModel(file, {
      onError: (error: AxiosError<ApiError>) => {
        if (!error.response?.data?.errorCode)
          toast.error(t('form_filler.file_uploader_validation_error_upload'));
      },
    });
  };

  const handleInvalidFileName = (file: File, fileNameError: FileNameError): void => {
    if (fileNameError) {
      validationAlert(fileNameError);
    }
    const fileNameWithoutExtension = FileNameUtils.removeExtension(file.name);
    if (doesFileExistInMetadataWithClassRef(appMetadata, fileNameWithoutExtension)) {
      const userConfirmed = window.confirm(
        t('schema_editor.error_upload_data_model_id_exists_override_option'),
      );
      if (userConfirmed) {
        uploadDataModel(file);
      }
    }
    if (doesFileExistInMetadataWithoutClassRef(appMetadata, fileNameWithoutExtension)) {
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
          onSubmit={handleSubmit}
          accept='.xsd'
          variant={uploaderButtonVariant}
          uploaderButtonText={uploadButtonText}
        />
      )}
    </span>
  );
};
