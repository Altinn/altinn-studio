import React from 'react';
import { FileSelector } from 'app-shared/components';
import { StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useUploadDataModelMutation } from '../../../../hooks/mutations/useUploadDataModelMutation';
import type { AxiosError } from 'axios';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { toast } from 'react-toastify';
import type { MetadataOption } from '../../../../types/MetadataOption';

export interface XSDUploadProps {
  disabled?: boolean;
  submitButtonRenderer?: (fileInputClickHandler: (event: any) => void) => JSX.Element;
  selectedOption?: MetadataOption;
}

export const XSDUpload = ({ disabled, submitButtonRenderer, selectedOption }: XSDUploadProps) => {
  const { t } = useTranslation();
  const { mutate: uploadDataModel, isPending: uploading } = useUploadDataModelMutation(
    selectedOption?.value?.repositoryRelativeUrl,
    {
      hideDefaultError: true,
    },
  );

  const uploadButton = React.useRef(null);

  const handleUpload = (formData: FormData) => {
    uploadDataModel(formData, {
      onError: (e: AxiosError<ApiError>) => {
        if (!e.response?.data?.errorCode)
          toast.error(t('form_filler.file_uploader_validation_error_upload'));
      },
    });
  };

  return (
    <span ref={uploadButton}>
      {uploading ? (
        <StudioSpinner spinnerTitle={t('app_data_modelling.uploading_xsd')} showSpinnerTitle />
      ) : (
        <FileSelector
          busy={false}
          submitHandler={handleUpload}
          accept='.xsd'
          formFileName='file'
          submitButtonRenderer={submitButtonRenderer}
          disabled={disabled}
        />
      )}
    </span>
  );
};
